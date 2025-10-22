#!/usr/bin/env python3
"""
Generate sample submission data for testing the deduplication system.

This creates realistic test data with:
- Multiple submissions per author
- Duplicate author identities (same person, different formats)
- Authors exceeding submission limits
- Various author name formats
"""

import pandas as pd
from datetime import datetime, timedelta
import random


def generate_sample_data(output_file: str = "data/sample_submissions.xlsx"):
    """Generate sample submission data."""

    # Sample authors with variations (simulating duplicates)
    authors_pool = [
        # Alice Zhang - 3 submissions (VIOLATION - same person, different formats)
        {
            "variants": [
                "Alice Zhang <alice.zhang@nus.edu.sg> (National University of Singapore)",
                "Zhang, Alice <alice.zhang@nus.edu.sg> (NUS)",
                "Alice Y. Zhang <alice.zhang@nus.edu.sg> (National University of Singapore)"
            ],
            "affiliation": "National University of Singapore",
            "submissions": 3
        },
        # Bob Li - 2 submissions (OK - at limit)
        {
            "variants": [
                "Bob Li <bob.li@google.com> (Google Research)",
                "Bob Li <bob.li@google.com> (Google Research)"
            ],
            "affiliation": "Google Research",
            "submissions": 2
        },
        # Carol Chen - 3 submissions (VIOLATION - different emails, same affiliation)
        {
            "variants": [
                "Carol Chen <cchen@stanford.edu> (Stanford University)",
                "C. Chen <carol.chen@stanford.edu> (Stanford)",
                "Carol Chen <carol@cs.stanford.edu> (Stanford University)"
            ],
            "affiliation": "Stanford University",
            "submissions": 3
        },
        # David Kumar - 1 submission (OK)
        {
            "variants": [
                "David Kumar <d.kumar@mit.edu> (MIT)"
            ],
            "affiliation": "MIT",
            "submissions": 1
        },
        # Emily Wang - 2 submissions (OK - same format)
        {
            "variants": [
                "Emily Wang <ewang@berkeley.edu> (UC Berkeley)",
                "Emily Wang <ewang@berkeley.edu> (University of California, Berkeley)"
            ],
            "affiliation": "UC Berkeley",
            "submissions": 2
        },
        # Frank Mueller - 4 submissions (VIOLATION - clear case)
        {
            "variants": [
                "Frank Mueller <frank.mueller@ethz.ch> (ETH Zurich)",
                "F. Mueller <frank.mueller@ethz.ch> (ETH)",
                "Frank Mueller <frank.mueller@ethz.ch> (ETH Zurich)",
                "Mueller, Frank <frank.mueller@ethz.ch> (ETH Zurich)"
            ],
            "affiliation": "ETH Zurich",
            "submissions": 4
        },
        # Grace Park - 1 submission (OK)
        {
            "variants": [
                "Grace Park <gpark@kaist.ac.kr> (KAIST)"
            ],
            "affiliation": "KAIST",
            "submissions": 1
        },
        # Henry Thompson - 2 submissions (OK)
        {
            "variants": [
                "Henry Thompson <h.thompson@oxford.ac.uk> (University of Oxford)",
                "H. Thompson <h.thompson@oxford.ac.uk> (Oxford University)"
            ],
            "affiliation": "University of Oxford",
            "submissions": 2
        },
        # Isabella Rodriguez - 3 submissions (VIOLATION - name variations)
        {
            "variants": [
                "Isabella Rodriguez <i.rodriguez@cmu.edu> (Carnegie Mellon)",
                "I. Rodriguez <isabella.rodriguez@cmu.edu> (CMU)",
                "Rodriguez, Isabella <i.rodriguez@cmu.edu> (Carnegie Mellon University)"
            ],
            "affiliation": "Carnegie Mellon",
            "submissions": 3
        },
    ]

    # Paper titles
    titles = [
        "Efficient Query Processing in Distributed Databases",
        "A Novel Approach to Transaction Management",
        "Optimizing Index Structures for Large-Scale Data",
        "Machine Learning for Query Optimization",
        "Scalable Data Integration Techniques",
        "Real-Time Analytics on Streaming Data",
        "Privacy-Preserving Data Mining Methods",
        "Blockchain-Based Database Systems",
        "Graph Database Query Languages",
        "Automated Database Tuning Using AI",
        "Consistency Models in Distributed Systems",
        "Efficient Join Algorithms for Big Data",
        "Cloud-Native Database Architectures",
        "Time-Series Data Management at Scale",
        "Federated Learning for Database Applications",
        "Semantic Query Optimization Techniques",
        "In-Memory Database Systems",
        "Multi-Model Database Design Patterns",
        "Database Security and Access Control",
        "Approximate Query Processing Methods"
    ]

    # Generate submission records
    submissions = []
    paper_id = 1
    base_date = datetime(2024, 1, 15)

    # Additional co-authors pool
    coauthors = [
        "John Smith <jsmith@example.com>",
        "Maria Garcia <mgarcia@example.org>",
        "James Wilson <jwilson@example.net>",
        "Sarah Johnson <sjohnson@example.edu>",
        "Michael Brown <mbrown@example.com>",
        "Lisa Anderson <landerson@example.org>",
        "Robert Taylor <rtaylor@example.net>",
        "Jennifer Martinez <jmartinez@example.edu>"
    ]

    for author_info in authors_pool:
        for i in range(author_info["submissions"]):
            # Select author variant
            if i < len(author_info["variants"]):
                author_variant = author_info["variants"][i]
            else:
                author_variant = author_info["variants"][0]

            # Add 1-2 co-authors
            num_coauthors = random.randint(1, 2)
            selected_coauthors = random.sample(coauthors, num_coauthors)

            # Create author list (main author first)
            all_authors = [author_variant] + selected_coauthors
            author_string = "; ".join(all_authors)

            # Select title
            title = random.choice(titles)

            # Generate submission date (within 30 days)
            days_offset = random.randint(0, 30)
            submission_date = base_date + timedelta(days=days_offset)

            submissions.append({
                "Paper ID": f"VLDB2024-{paper_id:03d}",
                "Title": title,
                "Authors": author_string,
                "Submission Date": submission_date,
                "Status": random.choice(["Under Review", "Under Review", "Under Review", "Withdrawn"])
            })

            paper_id += 1

    # Create DataFrame
    df = pd.DataFrame(submissions)

    # Sort by submission date
    df = df.sort_values("Submission Date")

    # Export to Excel
    df.to_excel(output_file, index=False)

    print(f"✅ Generated {len(submissions)} sample submissions")
    print(f"📁 Saved to: {output_file}")
    print(f"\n📊 Summary:")
    print(f"   - Total papers: {len(submissions)}")
    print(f"   - Authors with violations: 3 (Alice Zhang, Carol Chen, Frank Mueller)")
    print(f"   - Authors at limit: 3 (Bob Li, Emily Wang, Henry Thompson)")
    print(f"   - Authors under limit: 2 (David Kumar, Grace Park)")
    print(f"\n💡 Test the deduplication system to see if it catches:")
    print(f"   1. Same author with different name formats")
    print(f"   2. Same author with different email addresses")
    print(f"   3. Authors exceeding the 2-paper limit")


if __name__ == "__main__":
    import os

    # Create data directory if it doesn't exist
    os.makedirs("data", exist_ok=True)

    # Generate sample data
    generate_sample_data()
