# GreenAI User Guide

## Welcome to GreenAI! 🌱

GreenAI helps you track and reduce the carbon footprint of your machine learning workloads. This guide will help you get started and make the most of the platform.

---

## Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Projects](#managing-projects)
4. [API Keys & Integration](#api-keys--integration)
5. [Viewing Analytics](#viewing-analytics)
6. [Generating Reports](#generating-reports)
7. [Subscription & Billing](#subscription--billing)
8. [FAQ](#faq)

---

## Getting Started

### Step 1: Create an Account

1. Visit [https://greenai.dev](https://greenai.dev)
2. Click "Sign Up"
3. Enter your email and password
4. Choose your organization name
5. Click "Create Account"

You'll receive a welcome email with links to get started.

### Step 2: Complete Your Profile

1. Navigate to Settings (top-right avatar → Settings)
2. Add your organization details:
   - Organization name
   - Industry (optional)
   - Team size (optional)
3. Set your timezone for accurate reporting

### Step 3: Choose a Plan

GreenAI offers flexible pricing:

- **Starter** (Free): 10,000 job runs/month, 3 projects, 2 users
- **Professional** ($49/month): 100,000 job runs/month, 10 projects, 10 users
- **Enterprise** (Custom): Unlimited, custom features

Visit the [Billing page](https://greenai.dev/billing) to upgrade.

---

## Dashboard Overview

The dashboard is your command center for carbon tracking.

### Key Metrics

**Total Emissions**: Total CO2 emissions from all your ML jobs
- Measured in kg CO2e (carbon dioxide equivalent)
- Updated in real-time as jobs are ingested

**Total Energy**: Total electricity consumed
- Measured in kWh (kilowatt-hours)
- Includes GPU, CPU, and RAM energy usage

**Job Runs**: Number of ML jobs tracked
- By status: Success, Failed, Running, Queued

**Real-World Equivalents**:
- Miles driven by average car
- Trees needed to offset emissions
- Smartphones charged

### Recent Activity

See your latest job runs with:
- Run name and status
- Energy consumption
- Carbon emissions
- Timestamp

Click any job for detailed breakdown.

---

## Managing Projects

Projects help you organize your ML workloads by team, model, or environment.

### Create a Project

1. Click "Projects" in the sidebar
2. Click "New Project"
3. Fill in:
   - **Name**: e.g., "Production Training Pipeline"
   - **Description**: e.g., "Daily BERT retraining jobs"
   - **Tags** (optional): e.g., "production", "nlp"
4. Click "Create Project"

### Project Dashboard

Each project has its own dashboard showing:
- Total emissions for this project
- Top emitting jobs
- Monthly trends
- Hardware utilization breakdown

### Best Practices

- **Separate by environment**: Create separate projects for dev, staging, and production
- **Group by model**: Create one project per model family (e.g., "GPT Models", "ResNet Models")
- **Team-based**: Create projects for different teams or departments

---

## API Keys & Integration

API keys allow you to send job run data to GreenAI programmatically.

### Generate an API Key

1. Navigate to your project
2. Click "API Keys" tab
3. Click "Generate New Key"
4. Set:
   - **Name**: e.g., "Production Training Cluster"
   - **Scopes**: Select permissions (usually "ingest" is sufficient)
5. Click "Generate"
6. **Copy the key immediately** (it's only shown once!)

### Key Management

- **Active keys**: Green indicator, actively tracking jobs
- **Inactive keys**: Gray indicator, can be reactivated
- **Revoke**: Permanently delete a key (cannot be undone)

### Security Best Practices

- Store keys in environment variables, never in code
- Use separate keys for each environment (dev, staging, prod)
- Rotate keys every 90 days
- Revoke keys immediately if compromised

### Integration

Add GreenAI tracking to your ML training code:

```python
# At the start of training
import greenai

tracker = greenai.init(api_key="your-api-key", project_id="proj_abc123")
tracker.start_run(run_name="training-epoch-10")

# Your training code here
model.fit(X_train, y_train)

# At the end of training
tracker.end_run(status="success")
```

See the [API Integration Guide](./API_INTEGRATION_GUIDE.md) for detailed examples.

---

## Viewing Analytics

Analytics help you understand and optimize your carbon footprint.

### Summary View

**Metrics displayed:**
- Total emissions (all-time)
- Total energy consumption
- Number of job runs
- Environmental equivalents

**Time filters:**
- Last 7 days
- Last 30 days
- Last 90 days
- All time
- Custom range

### Trends

View monthly emissions and energy trends over time.

**What to look for:**
- Increasing trend → Review optimization opportunities
- Spikes → Investigate high-emission jobs
- Decreasing trend → Your optimizations are working!

### Hotspots

Identifies your most carbon-intensive jobs.

**Displays:**
- Top 10 emitting jobs
- Energy consumption per job
- Percentage of total emissions
- Hardware utilization

**Actions:**
- Click a job to see full details
- Identify optimization opportunities
- Compare similar jobs to find inefficiencies

### Project Breakdown

Understand emissions by:
- **Model**: Which models emit the most?
- **Job Type**: Training vs inference vs data processing
- **Region**: Which cloud regions are most carbon-intensive?
- **Hardware**: GPU vs CPU utilization

---

## Generating Reports

Reports provide detailed analysis for stakeholders, compliance, and optimization.

### Generate a Report

1. Navigate to "Reports" in the sidebar
2. Click "Generate New Report"
3. Configure:
   - **Report Type**: Summary, Detailed, or Comparison
   - **Time Range**: Last month, quarter, year, or custom
   - **Projects**: Select which projects to include
   - **Format**: PDF or CSV
4. Click "Generate Report"

Report generation takes 10-30 seconds. You'll receive an email when it's ready.

### Report Types

**Summary Report**
- High-level overview
- Total emissions, energy, job runs
- Month-over-month comparison
- Top insights and recommendations

**Detailed Report**
- Job-by-job breakdown
- Hardware utilization analysis
- Regional emissions comparison
- Optimization opportunities

**Comparison Report**
- Compare multiple projects
- Compare time periods
- Benchmark against industry averages

### Downloading Reports

1. Go to "Reports" → "Report History"
2. Find your report
3. Click "Download PDF" or "Download CSV"

Reports are available for 90 days.

### Sharing Reports

Click "Share" on any report to:
- Generate a public link (expires in 7 days)
- Email to team members
- Export to Google Drive / Dropbox

---

## Subscription & Billing

### View Usage

1. Go to "Billing" in the sidebar
2. See current month's usage:
   - Job runs used / limit
   - Projects used / limit
   - Users used / limit

**Usage percentage:**
- Green (0-60%): Healthy usage
- Yellow (61-80%): Approaching limit
- Red (81-100%): Near or at limit

### Upgrade Plan

1. Click "Upgrade Plan"
2. Select your desired plan
3. Enter payment details (Razorpay)
4. Confirm purchase

Your new limits apply immediately.

### Payment Methods

We accept:
- Credit/Debit cards
- UPI
- Net Banking
- Razorpay Wallet

All payments are processed securely through Razorpay.

### Billing History

View past invoices:
1. Go to "Billing" → "Invoice History"
2. Download any invoice as PDF
3. View payment status

### Overage Charges

If you exceed your plan limits:
- **Job Runs**: ₹50 per 1,000 additional runs (automatically charged)
- **Projects**: Upgrade required
- **Users**: Upgrade required

You'll receive email alerts at 80% and 100% of limits.

---

## FAQ

### General Questions

**Q: What is CO2e?**
A: CO2e (carbon dioxide equivalent) is a standard unit for measuring carbon footprint. It accounts for all greenhouse gases, not just CO2.

**Q: How accurate are the emissions calculations?**
A: We use region-specific grid emission factors and hardware-specific power consumption data. Accuracy is typically within 10-15% of actual emissions.

**Q: Can I track inference workloads?**
A: Yes! Use `job_type: "inference"` when ingesting jobs. Both training and inference are tracked.

### Technical Questions

**Q: What if I don't have energy measurements?**
A: GreenAI can estimate energy based on hardware specs and duration. Provide as much detail as possible for better estimates.

**Q: Can I backfill historical data?**
A: Yes! Set the `start_time` and `end_time` fields to historical dates when ingesting.

**Q: What cloud providers are supported?**
A: AWS, GCP, Azure, and on-premises. We have region-specific emission factors for all major cloud regions.

**Q: How do I delete data?**
A: Contact support@greenai.dev to request data deletion (GDPR compliant).

### Billing Questions

**Q: What happens if I exceed my limit?**
A: For job runs, overage charges apply automatically. For projects/users, you'll need to upgrade your plan.

**Q: Can I cancel anytime?**
A: Yes, cancel anytime from the Billing page. You'll retain access until the end of your billing period.

**Q: Do you offer discounts for nonprofits/education?**
A: Yes! Contact sales@greenai.dev with proof of nonprofit/educational status for a 50% discount.

### Integration Questions

**Q: Which ML frameworks are supported?**
A: GreenAI is framework-agnostic. It works with PyTorch, TensorFlow, JAX, Scikit-learn, and any other framework.

**Q: Can I integrate with MLflow / Weights & Biases?**
A: Yes! We have guides for popular experiment tracking tools. See [Integrations](https://greenai.dev/integrations).

**Q: Do you have a Python SDK?**
A: Coming soon! For now, use the REST API (see [API Guide](./API_INTEGRATION_GUIDE.md)).

---

## Tips & Best Practices

### Reduce Your Carbon Footprint

1. **Choose greener regions**: Use cloud regions powered by renewable energy (e.g., us-west-2 for AWS)
2. **Optimize models**: Use quantization, pruning, and distillation to reduce compute
3. **Batch efficiently**: Larger batch sizes → fewer training steps → lower energy
4. **Schedule strategically**: Run jobs during off-peak hours when grid carbon intensity is lower
5. **Right-size hardware**: Don't use 8 GPUs if 4 will do

### Maximize GreenAI Value

1. **Track everything**: Even failed jobs help identify waste
2. **Compare experiments**: Use the comparison feature to find efficient configurations
3. **Set up alerts**: Get notified when emissions spike unexpectedly
4. **Review monthly**: Check hotspots report monthly for optimization opportunities
5. **Share insights**: Export reports to share with leadership and stakeholders

---

## Getting Help

### Resources
- **Documentation**: https://docs.greenai.dev
- **API Reference**: https://api.greenai.dev/docs
- **Community Forum**: https://community.greenai.dev

### Contact Support
- **Email**: support@greenai.dev
- **Response time**: Within 24 hours (priority support for Pro/Enterprise)
- **Live chat**: Available Mon-Fri 9AM-5PM UTC

### Report Issues
- **GitHub**: https://github.com/greenai/issues
- **Status Page**: https://status.greenai.dev

---

## What's Next?

Now that you're set up, here are some next steps:

1. ✅ Integrate GreenAI with your first ML project
2. ✅ Track your first 100 job runs
3. ✅ Generate your first emissions report
4. ✅ Identify and fix your top carbon hotspot
5. ✅ Share your results with your team

**Welcome to the journey toward carbon-neutral AI!** 🌍

---

**Last Updated**: 2026-02-12
**Version**: 1.0
**Feedback**: docs@greenai.dev
