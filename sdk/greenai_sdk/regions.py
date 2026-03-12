"""Carbon intensity factors for cloud regions (kg CO2e per kWh)."""

# Sources: EPA eGRID, Electricity Maps, cloud provider sustainability reports
# Values represent annual average grid intensity where available
REGION_CARBON_INTENSITY: dict[str, float] = {
    # AWS regions
    "aws:us-east-1": 0.379,       # N. Virginia — US East
    "aws:us-east-2": 0.413,       # Ohio
    "aws:us-west-1": 0.207,       # N. California
    "aws:us-west-2": 0.136,       # Oregon (mostly renewable)
    "aws:ca-central-1": 0.130,    # Canada — Quebec (hydroelectric)
    "aws:eu-west-1": 0.214,       # Ireland
    "aws:eu-west-2": 0.231,       # London
    "aws:eu-west-3": 0.056,       # Paris (nuclear-heavy)
    "aws:eu-central-1": 0.338,    # Frankfurt
    "aws:eu-north-1": 0.008,      # Stockholm (very green)
    "aws:eu-south-1": 0.233,      # Milan
    "aws:ap-south-1": 0.708,      # Mumbai, India
    "aws:ap-southeast-1": 0.408,  # Singapore
    "aws:ap-southeast-2": 0.610,  # Sydney, Australia
    "aws:ap-northeast-1": 0.506,  # Tokyo
    "aws:ap-northeast-2": 0.415,  # Seoul
    "aws:ap-northeast-3": 0.506,  # Osaka
    "aws:ap-east-1": 0.360,       # Hong Kong
    "aws:sa-east-1": 0.074,       # Sao Paulo (hydro-dominant)
    "aws:me-south-1": 0.602,      # Bahrain
    "aws:af-south-1": 0.928,      # Cape Town, South Africa
    "aws:us-gov-west-1": 0.379,
    "aws:us-gov-east-1": 0.379,

    # GCP regions
    "gcp:us-central1": 0.479,     # Iowa
    "gcp:us-east1": 0.360,        # S. Carolina
    "gcp:us-east4": 0.379,        # N. Virginia
    "gcp:us-west1": 0.067,        # Oregon (renewable)
    "gcp:us-west2": 0.207,        # Los Angeles
    "gcp:us-west3": 0.531,        # Salt Lake City
    "gcp:us-west4": 0.438,        # Las Vegas
    "gcp:northamerica-northeast1": 0.030,  # Montreal (hydro)
    "gcp:southamerica-east1": 0.074,       # Sao Paulo
    "gcp:europe-west1": 0.201,    # Belgium
    "gcp:europe-west2": 0.231,    # London
    "gcp:europe-west3": 0.338,    # Frankfurt
    "gcp:europe-west4": 0.283,    # Netherlands
    "gcp:europe-west6": 0.029,    # Zurich (very green)
    "gcp:europe-north1": 0.010,   # Finland (almost carbon-free)
    "gcp:asia-south1": 0.708,     # Mumbai, India
    "gcp:asia-southeast1": 0.408, # Singapore
    "gcp:asia-southeast2": 0.651, # Jakarta
    "gcp:asia-east1": 0.543,      # Taiwan
    "gcp:asia-east2": 0.360,      # Hong Kong
    "gcp:asia-northeast1": 0.506, # Tokyo
    "gcp:asia-northeast2": 0.421, # Osaka
    "gcp:asia-northeast3": 0.415, # Seoul
    "gcp:australia-southeast1": 0.610,  # Sydney

    # Azure regions
    "azure:eastus": 0.379,
    "azure:eastus2": 0.379,
    "azure:westus": 0.207,
    "azure:westus2": 0.136,
    "azure:westus3": 0.438,
    "azure:centralus": 0.479,
    "azure:northcentralus": 0.413,
    "azure:southcentralus": 0.360,
    "azure:canadacentral": 0.130,
    "azure:canadaeast": 0.002,
    "azure:northeurope": 0.214,
    "azure:westeurope": 0.221,
    "azure:uksouth": 0.231,
    "azure:ukwest": 0.231,
    "azure:francecentral": 0.056,
    "azure:germanywestcentral": 0.338,
    "azure:norwayeast": 0.014,
    "azure:swedencentral": 0.008,
    "azure:switzerlandnorth": 0.029,
    "azure:centralindia": 0.708,
    "azure:southindia": 0.708,
    "azure:westindia": 0.708,
    "azure:eastasia": 0.360,
    "azure:southeastasia": 0.408,
    "azure:japaneast": 0.506,
    "azure:japanwest": 0.506,
    "azure:koreacentral": 0.415,
    "azure:australiaeast": 0.610,
    "azure:australiasoutheast": 0.610,
    "azure:brazilsouth": 0.074,
    "azure:southafricanorth": 0.928,
    "azure:uaenorth": 0.602,

    # Shorthand aliases (no cloud prefix)
    "us-east-1": 0.379,
    "us-east-2": 0.413,
    "us-west-1": 0.207,
    "us-west-2": 0.136,
    "ca-central-1": 0.130,
    "eu-west-1": 0.214,
    "eu-west-2": 0.231,
    "eu-west-3": 0.056,
    "eu-central-1": 0.338,
    "eu-north-1": 0.008,
    "ap-south-1": 0.708,
    "ap-southeast-1": 0.408,
    "ap-southeast-2": 0.610,
    "ap-northeast-1": 0.506,
    "ap-northeast-2": 0.415,
    "sa-east-1": 0.074,
    "us-central1": 0.479,
    "europe-west1": 0.201,
    "asia-south1": 0.708,
    "local": 0.475,
}

DEFAULT_INTENSITY = 0.475  # global average


def get_carbon_intensity(region: str) -> float:
    """Return carbon intensity in kg CO2e/kWh for a given region.

    Accepts full region strings like 'aws:us-east-1', 'gcp:us-central1',
    shorthand like 'us-east-1', or 'local' for on-prem/unknown.
    """
    if region in REGION_CARBON_INTENSITY:
        return REGION_CARBON_INTENSITY[region]

    # Try stripping cloud prefix
    for prefix in ("aws:", "gcp:", "azure:"):
        if region.startswith(prefix):
            short = region[len(prefix):]
            if short in REGION_CARBON_INTENSITY:
                return REGION_CARBON_INTENSITY[short]

    return DEFAULT_INTENSITY
