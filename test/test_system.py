#!/usr/bin/env python3
"""
Simple test script to verify the system works correctly.

Run this to test basic functionality without the full UI.
"""

from src import SubmissionAnalyzer


def test_basic_workflow():
    """Test the basic workflow of the system."""

    print("=" * 70)
    print(" Testing AuthCheck-VLDB System")
    print("=" * 70)

    # Initialize analyzer
    print("\n1️⃣ Initializing analyzer...")
    analyzer = SubmissionAnalyzer(submission_limit=2, similarity_threshold=85)
    print("   ✅ Analyzer created")

    # Load sample data
    print("\n2️⃣ Loading sample data...")
    try:
        analyzer.load_from_excel(
            'data/sample_submissions.xlsx',
            author_column='Authors',
            title_column='Title',
            id_column='Paper ID'
        )
        print(f"   ✅ Loaded {len(analyzer.submissions)} submissions")
    except Exception as e:
        print(f"   ❌ Error loading data: {e}")
        print("   💡 Run 'python create_sample_data.py' first")
        return

    # Analyze
    print("\n3️⃣ Analyzing submissions...")
    analyzer.analyze()
    print(f"   ✅ Found {len(analyzer.author_stats)} unique authors (before deduplication)")

    # Find duplicates
    print("\n4️⃣ Finding potential duplicates...")
    duplicate_groups = analyzer.find_potential_duplicates()
    print(f"   ✅ Found {len(duplicate_groups)} potential duplicate groups")

    if duplicate_groups:
        print("\n   Duplicate groups:")
        for i, group in enumerate(duplicate_groups, 1):
            print(f"\n   Group {i}:")
            for author in group:
                print(f"      - {author.name} <{author.email or 'no email'}>")

    # Check violations before merging
    print("\n5️⃣ Checking violations (before deduplication)...")
    violations = analyzer.get_violations()
    print(f"   Found {len(violations)} violation(s)")

    # Auto-merge duplicates with same email
    print("\n6️⃣ Auto-merging duplicates with same email...")
    merged_count = 0
    for group in duplicate_groups:
        # If all have the same email, auto-merge
        emails = [a.email for a in group if a.email]
        if emails and len(set(e.lower() for e in emails)) == 1:
            canonical = group[0]
            analyzer.merge_authors(group, canonical)
            merged_count += 1
            print(f"   ✅ Merged {len(group)} variants of {canonical.name}")

    if merged_count > 0:
        analyzer.analyze()
        print(f"\n   Total auto-merges: {merged_count}")

    # Check violations after merging
    print("\n7️⃣ Checking violations (after deduplication)...")
    violations = analyzer.get_violations()
    print(f"   ✅ Found {len(violations)} violation(s)")

    if violations:
        print("\n   Authors exceeding limit:")
        for stats in violations:
            print(f"      - {stats.author.name}: {stats.submission_count} submissions")
            for sub in stats.submissions:
                print(f"         • [{sub.paper_id}] {sub.title}")

    # Generate summary
    print("\n8️⃣ Generating summary...")
    summary = analyzer.generate_summary()
    print(summary)

    # Export results
    print("\n9️⃣ Exporting results...")
    try:
        analyzer.export_to_excel("test_output.xlsx")
        print("   ✅ Results exported to test_output.xlsx")
    except Exception as e:
        print(f"   ⚠️  Export warning: {e}")

    print("\n" + "=" * 70)
    print(" ✅ Test completed successfully!")
    print("=" * 70)
    print("\n💡 Next steps:")
    print("   - Try the CLI: python main_cli.py data/sample_submissions.xlsx")
    print("   - Try the web app: streamlit run src/web_app.py")
    print()


if __name__ == '__main__':
    test_basic_workflow()
