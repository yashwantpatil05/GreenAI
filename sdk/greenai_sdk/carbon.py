"""Carbon intensity lookup."""
REGION_INTENSITY = {
    "aws:us-east-1": 0.379,
    "aws:eu-west-1": 0.214,
    "gcp:europe-west1": 0.201,
    "azure:westeurope": 0.221,
}


def carbon_intensity(region: str) -> float:
    """Return carbon intensity in kg CO2e per kWh."""
    return REGION_INTENSITY.get(region, 0.45)
