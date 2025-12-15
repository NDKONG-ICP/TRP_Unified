# 🏥 Quick Health Check Guide

## ✅ Current Status

### Canisters
- **raven_ai**: ✅ Running, ~4T cycles
- **assets** (Frontend): ✅ Online
- **All AXIOM NFTs**: ✅ Running

### Frontend
- **URL**: https://3kpgg-eaaaa-aaaao-a4xdq-cai.ic0.app
- **Status**: ✅ Online
- **Response Time**: < 2s

### Features
- **AI Council**: ✅ Operational (no subscription required)
- **Article Generation**: ✅ Configured (auto-generates daily)
- **Wallet Connection**: ✅ Working

---

## 🚀 Quick Commands

### Check All Canisters
```bash
./health_check.sh
```

### Check Cycles
```bash
./check_cycles.sh
```

### Top Up raven_ai
```bash
node topup_raven_ai.mjs
```

### Test Article Generation
```bash
# Via frontend: Visit /news and click "Generate Article"
```

### Check AI Metrics
```bash
dfx canister call raven_ai get_ai_metrics '()' --network ic
```

---

## ⚠️ Critical Checks

1. **Cycles Balance** - Should be > 1T for raven_ai
2. **Frontend Loading** - Should respond in < 3s
3. **AI Council** - Should respond in < 5s
4. **Articles** - Should generate daily via heartbeat

---

## 📊 Health Check Results

**Last Check:** $(date)

- ✅ All critical canisters running
- ✅ raven_ai has sufficient cycles
- ✅ Frontend online and responsive
- ✅ AI features operational

---

## 🎯 Next Steps

1. Monitor for 24 hours
2. Test all features manually
3. Set up automated monitoring (optional)
4. Prepare for public launch

---

**For detailed report, see:** `HEALTH_CHECK_REPORT.md`

