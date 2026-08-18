import os
from dotenv import load_dotenv
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer

# Load environment variables
load_dotenv()
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://nbqpbyvtpzozzlnyozjg.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
model = SentenceTransformer('all-MiniLM-L6-v2')

# Rich Hackathon Demo Data
DEMO_DOCUMENTS = [
    {
        "title": "Aadhaar (Targeted Delivery of Financial and Other Subsidies, Benefits and Services) Act, 2016",
        "category": "Act",
        "date_issued": "2016-03-25",
        "department_name": "Ministry of Law and Justice",
        "source_url": "https://uidai.gov.in/images/targeted_delivery_of_financial_and_other_subsidies_benefits_and_services_13072016.pdf",
        "summary": "An Act to provide for, as a good governance, efficient, transparent, and targeted delivery of subsidies, benefits and services, the expenditure for which is incurred from the Consolidated Fund of India, to individuals residing in India through assigning of unique identity numbers to such individuals. It establishes the Unique Identification Authority of India (UIDAI) and lays down strict provisions regarding the privacy and security of biometric and demographic data.",
        "raw_text": "Detailed raw text regarding Aadhaar..."
    },
    {
        "title": "Gujarat State Teachers District-Level Transfer Policy 2026",
        "category": "GR",
        "date_issued": "2026-07-10",
        "department_name": "Education Department",
        "source_url": "https://gujaratindia.gov.in/pdf/teachers_transfer_2026.pdf",
        "summary": "This Government Resolution outlines the revised district-level transfer policy for primary and secondary school teachers in Gujarat. Key provisions include the prioritization of mutual transfers, relaxed conditions for widow and physically disabled teachers, and a mandatory 3-year minimum service requirement at the current posting before applying for an inter-district transfer. The policy aims to improve the teacher-student ratio in rural areas.",
        "raw_text": "Detailed raw text regarding Gujarat Teachers Transfer Policy..."
    },
    {
        "title": "Revised Rural Land Acquisition Compensation Rates",
        "category": "Notification",
        "date_issued": "2026-06-25",
        "department_name": "Revenue Department",
        "source_url": "https://gujaratindia.gov.in/pdf/land_acquisition_june.pdf",
        "summary": "Official notification detailing the revised compensation matrix for rural agricultural land acquired for state highway and infrastructure projects. The revision offers a 15% premium over the standard Jantri rates to expedite acquisitions and provides an additional rehabilitation allowance for families displaced by these infrastructure developments.",
        "raw_text": "Detailed raw text regarding Land Acquisition Compensation..."
    },
    {
        "title": "Revision of Minimum Pension Benefits for State Employees",
        "category": "GR",
        "date_issued": "2026-08-12",
        "department_name": "Finance Department",
        "source_url": "https://financedepartment.gujarat.gov.in/pdf/pension_revision.pdf",
        "summary": "The State Government announces an amendment to the Gujarat Civil Services (Pension) Rules, 2002. The minimum basic pension for all retiring Group D state government employees is enhanced from Rs. 9,000 per month to Rs. 12,500 per month. This resolution shall come into force with immediate effect and applies to all employees retiring on or after September 1, 2026. Dearness Relief (DR) will be calculated on this revised basic pension.",
        "raw_text": "Detailed raw text regarding Pension Benefits..."
    }
]

def inject_data():
    print("=== STARTING FLAWLESS DEMO DATA INJECTION ===")
    
    for doc in DEMO_DOCUMENTS:
        print(f"\nProcessing: {doc['title']}")
        
        # 1. Handle Department
        dept_response = supabase.table("departments").select("id").eq("name", doc["department_name"]).execute()
        if dept_response.data:
            dept_id = dept_response.data[0]["id"]
        else:
            print(f"  -> Creating department: {doc['department_name']}")
            new_dept = supabase.table("departments").insert({"name": doc["department_name"], "jurisdiction": "Central" if "Ministry" in doc["department_name"] else "State"}).execute()
            dept_id = new_dept.data[0]["id"]

        # 2. Generate Vector Embedding locally
        print("  -> Generating semantic vector embedding...")
        embedding = model.encode(doc["summary"]).tolist()
        
        # 3. Insert into Supabase
        print("  -> Pushing to Supabase...")
        data = {
            "title": doc["title"],
            "department_id": dept_id,
            "category": doc["category"],
            "date_issued": doc["date_issued"],
            "summary": doc["summary"],
            "raw_text": doc["raw_text"],
            "source_url": doc["source_url"],
            "embedding": embedding
        }
        
        supabase.table("documents").insert(data).execute()
        print("  -> Success!")
        
    print("\n=== DEMO DATA SEEDED SUCCESSFULLY! ===")

if __name__ == "__main__":
    inject_data()
