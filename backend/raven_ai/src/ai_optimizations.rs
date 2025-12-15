//! AI Pipeline Optimizations
//! Implements: Parallel queries, caching, circuit breakers, rate limiting, metrics

use candid::CandidType;
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::collections::{HashMap, VecDeque};
use ic_cdk::api::{time, canister_balance128, stable::stable64_size};
use sha2::{Sha256, Digest};

// ============================================================================
// Rate Limiting
// ============================================================================

#[derive(Clone, Debug)]
struct RateLimiter {
    requests: VecDeque<u64>,
    max_requests: usize,
    window_ns: u64,
}

impl RateLimiter {
    fn new(max_requests: usize, window_seconds: u64) -> Self {
        Self {
            requests: VecDeque::new(),
            max_requests,
            window_ns: window_seconds * 1_000_000_000,
        }
    }

    fn can_proceed(&mut self) -> bool {
        let now = time();
        
        // Remove old requests outside window
        while let Some(&timestamp) = self.requests.front() {
            if now - timestamp > self.window_ns {
                self.requests.pop_front();
            } else {
                break;
            }
        }
        
        // Check if under limit
        if self.requests.len() < self.max_requests {
            self.requests.push_back(now);
            true
        } else {
            false
        }
    }
}

thread_local! {
    static RATE_LIMITERS: RefCell<HashMap<String, RateLimiter>> = RefCell::new(HashMap::new());
}

pub fn check_rate_limit(user_id: &str, max_requests: usize, window_seconds: u64) -> bool {
    RATE_LIMITERS.with(|rl| {
        rl.borrow_mut()
            .entry(user_id.to_string())
            .or_insert_with(|| RateLimiter::new(max_requests, window_seconds))
            .can_proceed()
    })
}

// ============================================================================
// Circuit Breaker
// ============================================================================

#[derive(Clone, Debug)]
struct CircuitBreaker {
    failure_count: u32,
    last_failure_time: u64,
    threshold: u32,
    timeout_ns: u64,
}

impl CircuitBreaker {
    fn new(threshold: u32, timeout_seconds: u64) -> Self {
        Self {
            failure_count: 0,
            last_failure_time: 0,
            threshold,
            timeout_ns: timeout_seconds * 1_000_000_000,
        }
    }

    fn is_open(&self) -> bool {
        if self.failure_count >= self.threshold {
            let now = time();
            now - self.last_failure_time < self.timeout_ns
        } else {
            false
        }
    }

    fn record_success(&mut self) {
        self.failure_count = 0;
    }

    fn record_failure(&mut self) {
        self.failure_count += 1;
        self.last_failure_time = time();
    }
}

thread_local! {
    static CIRCUIT_BREAKERS: RefCell<HashMap<String, CircuitBreaker>> = RefCell::new(HashMap::new());
}

pub fn check_circuit_breaker(provider_name: &str) -> bool {
    CIRCUIT_BREAKERS.with(|cb| {
        let mut breakers = cb.borrow_mut();
        let breaker = breakers
            .entry(provider_name.to_string())
            .or_insert_with(|| CircuitBreaker::new(5, 60)); // 5 failures, 60s timeout
        
        !breaker.is_open()
    })
}

pub fn record_provider_success(provider_name: &str) {
    CIRCUIT_BREAKERS.with(|cb| {
        cb.borrow_mut()
            .entry(provider_name.to_string())
            .or_insert_with(|| CircuitBreaker::new(5, 60))
            .record_success();
    });
}

pub fn record_provider_failure(provider_name: &str) {
    CIRCUIT_BREAKERS.with(|cb| {
        cb.borrow_mut()
            .entry(provider_name.to_string())
            .or_insert_with(|| CircuitBreaker::new(5, 60))
            .record_failure();
    });
}

// ============================================================================
// Response Caching
// ============================================================================

#[derive(Clone, Debug)]
struct CacheEntry {
    data: String,
    timestamp: u64,
    ttl_ns: u64,
}

thread_local! {
    static RESPONSE_CACHE: RefCell<HashMap<String, CacheEntry>> = RefCell::new(HashMap::new());
}

pub fn cache_key(query: &str, system_prompt: &str, context_hash: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(query.as_bytes());
    hasher.update(system_prompt.as_bytes());
    hasher.update(context_hash.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub fn get_cached_response(key: &str, ttl_seconds: u64) -> Option<String> {
    RESPONSE_CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        let now = time();
        let ttl_ns = ttl_seconds * 1_000_000_000;
        
        if let Some(entry) = cache.get(key) {
            if now - entry.timestamp < ttl_ns {
                Some(entry.data.clone())
            } else {
                // Expired, remove
                cache.remove(key);
                None
            }
        } else {
            None
        }
    })
}

pub fn set_cached_response(key: String, data: String, ttl_seconds: u64) {
    RESPONSE_CACHE.with(|cache| {
        let ttl_ns = ttl_seconds * 1_000_000_000;
        cache.borrow_mut().insert(key, CacheEntry {
            data,
            timestamp: time(),
            ttl_ns,
        });
    });
}

// ============================================================================
// Metrics
// ============================================================================

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Default)]
pub struct ProviderStats {
    pub requests: u64,
    pub successes: u64,
    pub failures: u64,
    pub total_latency_ms: u64,
    pub total_tokens: u64,
    pub last_failure: Option<String>,
}

impl ProviderStats {
    pub fn average_latency_ms(&self) -> f32 {
        if self.successes > 0 {
            self.total_latency_ms as f32 / self.successes as f32
        } else {
            0.0
        }
    }

    pub fn success_rate(&self) -> f32 {
        if self.requests > 0 {
            self.successes as f32 / self.requests as f32
        } else {
            0.0
        }
    }
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug, Default)]
pub struct AIMetrics {
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub total_cycles_spent: u64,
    pub provider_stats: HashMap<String, ProviderStats>,
}

thread_local! {
    static METRICS: RefCell<AIMetrics> = RefCell::new(AIMetrics::default());
}

pub fn record_request_metrics(
    provider: &str,
    success: bool,
    latency_ms: u64,
    tokens: u64,
    error: Option<String>,
) {
    METRICS.with(|m| {
        let mut metrics = m.borrow_mut();
        metrics.total_requests += 1;
        
        if success {
            metrics.successful_requests += 1;
        } else {
            metrics.failed_requests += 1;
        }
        
        let stats = metrics.provider_stats
            .entry(provider.to_string())
            .or_insert_with(ProviderStats::default);
        
        stats.requests += 1;
        if success {
            stats.successes += 1;
            stats.total_latency_ms += latency_ms;
            stats.total_tokens += tokens;
        } else {
            stats.failures += 1;
            stats.last_failure = error;
        }
    });
}

pub fn get_metrics() -> AIMetrics {
    METRICS.with(|m| m.borrow().clone())
}

pub fn reset_metrics() {
    METRICS.with(|m| *m.borrow_mut() = AIMetrics::default());
}

// ============================================================================
// Health Check
// ============================================================================

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ProviderHealth {
    pub status: String, // "healthy", "degraded", "unhealthy"
    pub success_rate: f32,
    pub average_latency_ms: f32,
    pub circuit_breaker_open: bool,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct HealthCheck {
    pub status: String,
    pub providers: HashMap<String, ProviderHealth>,
    pub cycles_balance: u64,
    pub memory_usage: u64,
    pub cache_size: u32,
}

pub fn health_check() -> HealthCheck {
    let cycles = canister_balance128() as u64;
    let memory = (stable64_size() * 65536) as u64;
    
    let metrics = get_metrics();
    let cache_size = RESPONSE_CACHE.with(|c| c.borrow().len() as u32);
    
    let providers: HashMap<String, ProviderHealth> = metrics.provider_stats.iter()
        .map(|(name, stats)| {
            let success_rate = stats.success_rate();
            let circuit_open = !check_circuit_breaker(name);
            
            let status = if circuit_open {
                "unhealthy"
            } else if success_rate > 0.9 {
                "healthy"
            } else if success_rate > 0.7 {
                "degraded"
            } else {
                "unhealthy"
            };
            
            (name.clone(), ProviderHealth {
                status: status.to_string(),
                success_rate,
                average_latency_ms: stats.average_latency_ms(),
                circuit_breaker_open: circuit_open,
            })
        })
        .collect();
    
    let status = if cycles > 1_000_000_000_000 {
        "healthy"
    } else {
        "low_cycles"
    };
    
    HealthCheck {
        status: status.to_string(),
        providers,
        cycles_balance: cycles,
        memory_usage: memory,
        cache_size,
    }
}

/// Cleanup old cache entries (keep only last 1000)
pub fn cleanup_cache() {
    RESPONSE_CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        if cache.len() > 1000 {
            // Remove oldest 20% of entries
            let mut entries: Vec<_> = cache.iter().map(|(k, v)| (k.clone(), v.timestamp)).collect();
            entries.sort_by_key(|(_, ts)| *ts);
            
            let to_remove = entries.len() / 5; // Remove 20%
            for (key, _) in entries.iter().take(to_remove) {
                cache.remove(key);
            }
        }
    });
}

