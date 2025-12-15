//! ASE Service Manuals for Top 20 Semi Trucks
//! Comprehensive repair and maintenance documentation

use candid::{CandidType, Decode, Encode};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Vehicle manufacturer information
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Manufacturer {
    pub id: String,
    pub name: String,
    pub country: String,
    pub founded: u16,
    pub headquarters: String,
}

/// Vehicle model information
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct VehicleModel {
    pub id: String,
    pub manufacturer_id: String,
    pub name: String,
    pub model_years: Vec<u16>,
    pub class: VehicleClass,
    pub engine_types: Vec<String>,
    pub transmission_types: Vec<String>,
    pub gvwr_range: String,
    pub common_uses: Vec<String>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum VehicleClass {
    Class7,
    Class8,
    HeavyDuty,
    MediumDuty,
}

/// Service manual category
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum ManualCategory {
    Engine,
    Transmission,
    Brakes,
    Electrical,
    Suspension,
    HVAC,
    FuelSystem,
    Exhaust,
    Steering,
    Drivetrain,
    BodyCab,
    SafetySystems,
}

/// Service manual section
#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ManualSection {
    pub id: String,
    pub vehicle_id: String,
    pub category: ManualCategory,
    pub title: String,
    pub content: String,
    pub diagrams: Vec<Diagram>,
    pub specifications: Vec<Specification>,
    pub procedures: Vec<Procedure>,
    pub troubleshooting: Vec<TroubleshootingGuide>,
    pub torque_specs: Vec<TorqueSpec>,
    pub fluid_specs: Vec<FluidSpec>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Diagram {
    pub id: String,
    pub title: String,
    pub description: String,
    pub image_url: String,
    pub components: Vec<DiagramComponent>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct DiagramComponent {
    pub number: u32,
    pub name: String,
    pub part_number: Option<String>,
    pub description: String,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Specification {
    pub name: String,
    pub value: String,
    pub unit: Option<String>,
    pub notes: Option<String>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct Procedure {
    pub id: String,
    pub title: String,
    pub difficulty: ProcedureDifficulty,
    pub estimated_time: String,
    pub tools_required: Vec<String>,
    pub parts_required: Vec<String>,
    pub safety_warnings: Vec<String>,
    pub steps: Vec<ProcedureStep>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub enum ProcedureDifficulty {
    Basic,
    Intermediate,
    Advanced,
    Expert,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct ProcedureStep {
    pub number: u32,
    pub instruction: String,
    pub caution: Option<String>,
    pub tip: Option<String>,
    pub image_url: Option<String>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TroubleshootingGuide {
    pub symptom: String,
    pub possible_causes: Vec<String>,
    pub diagnostic_steps: Vec<String>,
    pub solutions: Vec<String>,
    pub related_dtc_codes: Vec<String>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct TorqueSpec {
    pub component: String,
    pub torque_value: String,
    pub sequence: Option<String>,
    pub notes: Option<String>,
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct FluidSpec {
    pub fluid_type: String,
    pub capacity: String,
    pub specification: String,
    pub change_interval: String,
}

/// Initialize the top 20 semi truck database
pub fn get_top_20_semi_trucks() -> Vec<VehicleModel> {
    vec![
        // Freightliner Models
        VehicleModel {
            id: "freightliner-cascadia".to_string(),
            manufacturer_id: "freightliner".to_string(),
            name: "Cascadia".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "Detroit DD13".to_string(),
                "Detroit DD15".to_string(),
                "Detroit DD16".to_string(),
                "Cummins X15".to_string(),
            ],
            transmission_types: vec![
                "Detroit DT12".to_string(),
                "Eaton Fuller".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Long Haul".to_string(), "Regional".to_string()],
        },
        VehicleModel {
            id: "freightliner-m2-106".to_string(),
            manufacturer_id: "freightliner".to_string(),
            name: "M2 106".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::MediumDuty,
            engine_types: vec![
                "Cummins B6.7".to_string(),
                "Cummins L9".to_string(),
            ],
            transmission_types: vec![
                "Allison 2500".to_string(),
                "Eaton Fuller".to_string(),
            ],
            gvwr_range: "26,000 - 33,000 lbs".to_string(),
            common_uses: vec!["Delivery".to_string(), "Vocational".to_string()],
        },
        // Peterbilt Models
        VehicleModel {
            id: "peterbilt-579".to_string(),
            manufacturer_id: "peterbilt".to_string(),
            name: "579".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "PACCAR MX-13".to_string(),
                "Cummins X15".to_string(),
            ],
            transmission_types: vec![
                "PACCAR TX-12".to_string(),
                "Eaton Fuller".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Long Haul".to_string(), "Regional".to_string()],
        },
        VehicleModel {
            id: "peterbilt-389".to_string(),
            manufacturer_id: "peterbilt".to_string(),
            name: "389".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "PACCAR MX-13".to_string(),
                "Cummins X15".to_string(),
            ],
            transmission_types: vec![
                "Eaton Fuller".to_string(),
                "PACCAR TX-18".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Long Haul".to_string(), "Owner Operator".to_string()],
        },
        VehicleModel {
            id: "peterbilt-567".to_string(),
            manufacturer_id: "peterbilt".to_string(),
            name: "567".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "PACCAR MX-13".to_string(),
                "Cummins X15".to_string(),
            ],
            transmission_types: vec![
                "Allison 4500".to_string(),
                "Eaton Fuller".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Vocational".to_string(), "Construction".to_string()],
        },
        // Kenworth Models
        VehicleModel {
            id: "kenworth-t680".to_string(),
            manufacturer_id: "kenworth".to_string(),
            name: "T680".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "PACCAR MX-13".to_string(),
                "Cummins X15".to_string(),
            ],
            transmission_types: vec![
                "PACCAR TX-12".to_string(),
                "Eaton Fuller".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Long Haul".to_string(), "Regional".to_string()],
        },
        VehicleModel {
            id: "kenworth-w900".to_string(),
            manufacturer_id: "kenworth".to_string(),
            name: "W900".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "PACCAR MX-13".to_string(),
                "Cummins X15".to_string(),
            ],
            transmission_types: vec![
                "Eaton Fuller".to_string(),
                "PACCAR TX-18".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Long Haul".to_string(), "Heavy Haul".to_string()],
        },
        VehicleModel {
            id: "kenworth-t880".to_string(),
            manufacturer_id: "kenworth".to_string(),
            name: "T880".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "PACCAR MX-13".to_string(),
                "Cummins X15".to_string(),
            ],
            transmission_types: vec![
                "Allison 4500".to_string(),
                "Eaton Fuller".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Vocational".to_string(), "Construction".to_string()],
        },
        // Volvo Models
        VehicleModel {
            id: "volvo-vnl".to_string(),
            manufacturer_id: "volvo".to_string(),
            name: "VNL".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "Volvo D11".to_string(),
                "Volvo D13".to_string(),
                "Cummins X15".to_string(),
            ],
            transmission_types: vec![
                "Volvo I-Shift".to_string(),
                "Eaton Fuller".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Long Haul".to_string(), "Regional".to_string()],
        },
        VehicleModel {
            id: "volvo-vnr".to_string(),
            manufacturer_id: "volvo".to_string(),
            name: "VNR".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "Volvo D11".to_string(),
                "Volvo D13".to_string(),
            ],
            transmission_types: vec![
                "Volvo I-Shift".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Regional".to_string(), "Distribution".to_string()],
        },
        VehicleModel {
            id: "volvo-vhd".to_string(),
            manufacturer_id: "volvo".to_string(),
            name: "VHD".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "Volvo D11".to_string(),
                "Volvo D13".to_string(),
            ],
            transmission_types: vec![
                "Allison 4500".to_string(),
                "Volvo I-Shift".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Vocational".to_string(), "Construction".to_string()],
        },
        // Mack Models
        VehicleModel {
            id: "mack-anthem".to_string(),
            manufacturer_id: "mack".to_string(),
            name: "Anthem".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "Mack MP7".to_string(),
                "Mack MP8".to_string(),
            ],
            transmission_types: vec![
                "Mack mDRIVE".to_string(),
                "Eaton Fuller".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Long Haul".to_string(), "Regional".to_string()],
        },
        VehicleModel {
            id: "mack-pinnacle".to_string(),
            manufacturer_id: "mack".to_string(),
            name: "Pinnacle".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "Mack MP7".to_string(),
                "Mack MP8".to_string(),
            ],
            transmission_types: vec![
                "Mack mDRIVE".to_string(),
                "Eaton Fuller".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Long Haul".to_string(), "Heavy Haul".to_string()],
        },
        VehicleModel {
            id: "mack-granite".to_string(),
            manufacturer_id: "mack".to_string(),
            name: "Granite".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "Mack MP7".to_string(),
                "Mack MP8".to_string(),
            ],
            transmission_types: vec![
                "Allison 4500".to_string(),
                "Mack mDRIVE".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Vocational".to_string(), "Construction".to_string()],
        },
        // International Models
        VehicleModel {
            id: "international-lt".to_string(),
            manufacturer_id: "international".to_string(),
            name: "LT Series".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "International A26".to_string(),
                "Cummins X15".to_string(),
            ],
            transmission_types: vec![
                "Eaton Fuller".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Long Haul".to_string(), "Regional".to_string()],
        },
        VehicleModel {
            id: "international-lonestar".to_string(),
            manufacturer_id: "international".to_string(),
            name: "LoneStar".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "Cummins X15".to_string(),
            ],
            transmission_types: vec![
                "Eaton Fuller".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Long Haul".to_string(), "Owner Operator".to_string()],
        },
        VehicleModel {
            id: "international-hx".to_string(),
            manufacturer_id: "international".to_string(),
            name: "HX Series".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "International A26".to_string(),
                "Cummins X15".to_string(),
            ],
            transmission_types: vec![
                "Allison 4500".to_string(),
                "Eaton Fuller".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Vocational".to_string(), "Construction".to_string()],
        },
        // Western Star Models
        VehicleModel {
            id: "western-star-4900".to_string(),
            manufacturer_id: "western-star".to_string(),
            name: "4900".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "Detroit DD13".to_string(),
                "Detroit DD15".to_string(),
                "Cummins X15".to_string(),
            ],
            transmission_types: vec![
                "Detroit DT12".to_string(),
                "Eaton Fuller".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Long Haul".to_string(), "Heavy Haul".to_string()],
        },
        VehicleModel {
            id: "western-star-49x".to_string(),
            manufacturer_id: "western-star".to_string(),
            name: "49X".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "Detroit DD13".to_string(),
                "Detroit DD15".to_string(),
            ],
            transmission_types: vec![
                "Allison 4500".to_string(),
                "Detroit DT12".to_string(),
            ],
            gvwr_range: "33,000 - 80,000 lbs".to_string(),
            common_uses: vec!["Vocational".to_string(), "Construction".to_string()],
        },
        // Hino Models
        VehicleModel {
            id: "hino-xl8".to_string(),
            manufacturer_id: "hino".to_string(),
            name: "XL8".to_string(),
            model_years: (2018..=2025).collect(),
            class: VehicleClass::Class8,
            engine_types: vec![
                "Cummins L9".to_string(),
            ],
            transmission_types: vec![
                "Allison 3000".to_string(),
            ],
            gvwr_range: "33,000 - 60,000 lbs".to_string(),
            common_uses: vec!["Regional".to_string(), "Distribution".to_string()],
        },
    ]
}

/// Get manufacturers
pub fn get_manufacturers() -> Vec<Manufacturer> {
    vec![
        Manufacturer {
            id: "freightliner".to_string(),
            name: "Freightliner".to_string(),
            country: "USA".to_string(),
            founded: 1942,
            headquarters: "Portland, Oregon".to_string(),
        },
        Manufacturer {
            id: "peterbilt".to_string(),
            name: "Peterbilt".to_string(),
            country: "USA".to_string(),
            founded: 1939,
            headquarters: "Denton, Texas".to_string(),
        },
        Manufacturer {
            id: "kenworth".to_string(),
            name: "Kenworth".to_string(),
            country: "USA".to_string(),
            founded: 1923,
            headquarters: "Kirkland, Washington".to_string(),
        },
        Manufacturer {
            id: "volvo".to_string(),
            name: "Volvo Trucks".to_string(),
            country: "Sweden".to_string(),
            founded: 1928,
            headquarters: "Gothenburg, Sweden".to_string(),
        },
        Manufacturer {
            id: "mack".to_string(),
            name: "Mack Trucks".to_string(),
            country: "USA".to_string(),
            founded: 1900,
            headquarters: "Greensboro, North Carolina".to_string(),
        },
        Manufacturer {
            id: "international".to_string(),
            name: "International Trucks".to_string(),
            country: "USA".to_string(),
            founded: 1902,
            headquarters: "Lisle, Illinois".to_string(),
        },
        Manufacturer {
            id: "western-star".to_string(),
            name: "Western Star".to_string(),
            country: "USA".to_string(),
            founded: 1967,
            headquarters: "Portland, Oregon".to_string(),
        },
        Manufacturer {
            id: "hino".to_string(),
            name: "Hino Trucks".to_string(),
            country: "Japan".to_string(),
            founded: 1942,
            headquarters: "Hino, Tokyo".to_string(),
        },
    ]
}

/// Generate sample engine manual section for a vehicle
pub fn generate_engine_manual(vehicle_id: &str) -> ManualSection {
    ManualSection {
        id: format!("{}-engine", vehicle_id),
        vehicle_id: vehicle_id.to_string(),
        category: ManualCategory::Engine,
        title: "Engine Service Manual".to_string(),
        content: r#"
# Engine Service Manual

This comprehensive guide covers all aspects of engine maintenance, repair, and troubleshooting.

## Safety Precautions
- Always disconnect the battery before performing electrical work
- Allow the engine to cool before servicing
- Use proper lifting equipment for heavy components
- Wear appropriate PPE including safety glasses and gloves

## Routine Maintenance Schedule
| Interval | Service Item |
|----------|-------------|
| Daily | Check oil level, coolant level, air filter indicator |
| 15,000 miles | Oil & filter change, fuel filter replacement |
| 30,000 miles | Air filter replacement, coolant analysis |
| 60,000 miles | Valve adjustment, injector inspection |
| 120,000 miles | Major service, turbo inspection |

## Common Diagnostic Trouble Codes (DTCs)
- SPN 100: Engine Oil Pressure
- SPN 102: Boost Pressure
- SPN 110: Engine Coolant Temperature
- SPN 190: Engine Speed
- SPN 520: Aftertreatment System
        "#.to_string(),
        diagrams: vec![
            Diagram {
                id: "engine-overview".to_string(),
                title: "Engine Component Overview".to_string(),
                description: "Main engine components and locations".to_string(),
                image_url: "/diagrams/engine-overview.svg".to_string(),
                components: vec![
                    DiagramComponent {
                        number: 1,
                        name: "Turbocharger".to_string(),
                        part_number: Some("A-470-090-01-80".to_string()),
                        description: "Variable geometry turbocharger".to_string(),
                    },
                    DiagramComponent {
                        number: 2,
                        name: "EGR Valve".to_string(),
                        part_number: Some("A-470-090-02-40".to_string()),
                        description: "Exhaust gas recirculation valve".to_string(),
                    },
                    DiagramComponent {
                        number: 3,
                        name: "Fuel Injector".to_string(),
                        part_number: Some("A-470-070-01-87".to_string()),
                        description: "Common rail fuel injector".to_string(),
                    },
                ],
            },
        ],
        specifications: vec![
            Specification {
                name: "Displacement".to_string(),
                value: "12.8".to_string(),
                unit: Some("Liters".to_string()),
                notes: None,
            },
            Specification {
                name: "Horsepower".to_string(),
                value: "400-505".to_string(),
                unit: Some("HP".to_string()),
                notes: Some("Depending on tune".to_string()),
            },
            Specification {
                name: "Torque".to_string(),
                value: "1,550-1,850".to_string(),
                unit: Some("lb-ft".to_string()),
                notes: None,
            },
            Specification {
                name: "Oil Capacity".to_string(),
                value: "42".to_string(),
                unit: Some("Quarts".to_string()),
                notes: Some("With filter change".to_string()),
            },
        ],
        procedures: vec![
            Procedure {
                id: "oil-change".to_string(),
                title: "Engine Oil and Filter Change".to_string(),
                difficulty: ProcedureDifficulty::Basic,
                estimated_time: "45 minutes".to_string(),
                tools_required: vec![
                    "Oil drain pan (15 gallon minimum)".to_string(),
                    "36mm socket for drain plug".to_string(),
                    "Oil filter wrench".to_string(),
                    "Funnel".to_string(),
                ],
                parts_required: vec![
                    "Engine oil - 42 quarts CK-4 15W-40".to_string(),
                    "Oil filter".to_string(),
                    "Drain plug gasket".to_string(),
                ],
                safety_warnings: vec![
                    "Hot oil can cause severe burns - allow engine to cool".to_string(),
                    "Properly dispose of used oil".to_string(),
                ],
                steps: vec![
                    ProcedureStep {
                        number: 1,
                        instruction: "Position drain pan under oil pan drain plug".to_string(),
                        caution: Some("Ensure pan is large enough to catch all oil".to_string()),
                        tip: None,
                        image_url: None,
                    },
                    ProcedureStep {
                        number: 2,
                        instruction: "Remove drain plug using 36mm socket and allow oil to drain completely".to_string(),
                        caution: None,
                        tip: Some("Warm oil drains faster - run engine briefly if cold".to_string()),
                        image_url: None,
                    },
                    ProcedureStep {
                        number: 3,
                        instruction: "Replace drain plug gasket and reinstall plug".to_string(),
                        caution: None,
                        tip: None,
                        image_url: None,
                    },
                    ProcedureStep {
                        number: 4,
                        instruction: "Remove old oil filter using filter wrench".to_string(),
                        caution: None,
                        tip: None,
                        image_url: None,
                    },
                    ProcedureStep {
                        number: 5,
                        instruction: "Apply thin coat of new oil to new filter gasket and install".to_string(),
                        caution: Some("Do not over-tighten - hand tight plus 3/4 turn".to_string()),
                        tip: None,
                        image_url: None,
                    },
                    ProcedureStep {
                        number: 6,
                        instruction: "Add new oil through fill cap - check level on dipstick".to_string(),
                        caution: None,
                        tip: Some("Add oil slowly to prevent overfilling".to_string()),
                        image_url: None,
                    },
                    ProcedureStep {
                        number: 7,
                        instruction: "Start engine and check for leaks. Verify oil pressure.".to_string(),
                        caution: None,
                        tip: None,
                        image_url: None,
                    },
                ],
            },
        ],
        troubleshooting: vec![
            TroubleshootingGuide {
                symptom: "Low Oil Pressure Warning".to_string(),
                possible_causes: vec![
                    "Low oil level".to_string(),
                    "Faulty oil pressure sensor".to_string(),
                    "Worn oil pump".to_string(),
                    "Clogged oil filter".to_string(),
                    "Internal engine wear".to_string(),
                ],
                diagnostic_steps: vec![
                    "Check oil level on dipstick".to_string(),
                    "Inspect for external oil leaks".to_string(),
                    "Connect diagnostic tool and read oil pressure sensor data".to_string(),
                    "Install mechanical gauge to verify actual pressure".to_string(),
                ],
                solutions: vec![
                    "Add oil to proper level".to_string(),
                    "Replace oil pressure sensor if faulty".to_string(),
                    "Replace oil pump if worn".to_string(),
                    "Replace oil filter".to_string(),
                ],
                related_dtc_codes: vec![
                    "SPN 100 - FMI 1: Low Oil Pressure".to_string(),
                    "SPN 100 - FMI 18: Low Oil Pressure - Moderately Severe".to_string(),
                ],
            },
        ],
        torque_specs: vec![
            TorqueSpec {
                component: "Oil Drain Plug".to_string(),
                torque_value: "35-40 ft-lbs".to_string(),
                sequence: None,
                notes: Some("Replace gasket each time".to_string()),
            },
            TorqueSpec {
                component: "Cylinder Head Bolts".to_string(),
                torque_value: "See sequence".to_string(),
                sequence: Some("Step 1: 60 ft-lbs, Step 2: 90°, Step 3: 90°".to_string()),
                notes: Some("Use new bolts - torque-to-yield".to_string()),
            },
        ],
        fluid_specs: vec![
            FluidSpec {
                fluid_type: "Engine Oil".to_string(),
                capacity: "42 quarts".to_string(),
                specification: "API CK-4 15W-40".to_string(),
                change_interval: "15,000 miles or 6 months".to_string(),
            },
            FluidSpec {
                fluid_type: "Coolant".to_string(),
                capacity: "14 gallons".to_string(),
                specification: "OAT Extended Life Coolant".to_string(),
                change_interval: "600,000 miles or 6 years".to_string(),
            },
        ],
    }
}






