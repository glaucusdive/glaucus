#!/usr/bin/env python3
"""
Process US dive shops CSV and generate clean SQL INSERT statements
Maps to database schema: business_name, street_address, locale, country, region, website_url, phone, email, google_rating
"""

import csv
import re
import sys

def clean_text(text):
    """Clean and escape text for SQL"""
    if not text or text.strip() == '':
        return None
    # Remove extra whitespace and escape single quotes
    cleaned = re.sub(r'\s+', ' ', text.strip())
    cleaned = cleaned.replace("'", "''")
    return cleaned

def clean_rating(rating_str):
    """Clean rating string and convert to numeric"""
    if not rating_str or rating_str.strip() == '':
        return None
    try:
        # Extract numeric rating
        rating = float(rating_str.strip())
        if 0 <= rating <= 5:
            return rating
        return None
    except ValueError:
        return None

def extract_state_from_region(region_str):
    """Extract state from region string like 'Alabama – Gulf Shores' -> 'Alabama'"""
    if not region_str:
        return None
    # Split by dash and take first part
    parts = region_str.split('–')
    if len(parts) > 0:
        return clean_text(parts[0].strip())
    return clean_text(region_str)

def process_us_csv():
    """Process US CSV and generate clean SQL"""
    
    csv_file = "csvfiles/US Scuba Shops 8.13.25.csv"
    output_file = "supabase/migrations/20241221000017_insert_us_diveshops_data.sql"
    
    sql_statements = []
    sql_statements.append("-- US Dive Shops Import")
    sql_statements.append("-- Generated from: US Scuba Shops 8.13.25.csv")
    sql_statements.append("-- Total: 196 dive shops across all US states and territories")
    sql_statements.append("")
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Map CSV columns to database schema with proper cleaning
            business_name = clean_text(row.get('Business Name', ''))
            street_address = clean_text(row.get('Address', ''))
            locale = clean_text(row.get('City/Island', ''))
            country = 'United States'
            region = extract_state_from_region(row.get('Region/Island', ''))
            website_url = clean_text(row.get('Website', ''))
            phone = clean_text(row.get('Phone', ''))
            email = clean_text(row.get('Email', ''))
            
            # Handle Google rating - check multiple possible columns
            google_rating = None
            if row.get('Google_Stars_FirstParty'):
                google_rating = clean_rating(row.get('Google_Stars_FirstParty'))
            
            # Skip if missing essential data
            if not business_name:
                continue
                
            # Build SQL INSERT statement
            sql = f"""INSERT INTO diveshops (
    business_name, street_address, locale, country, region, 
    website_url, phone, email, google_rating
) VALUES (
    '{business_name}',
    {f"'{street_address}'" if street_address else 'NULL'},
    {f"'{locale}'" if locale else 'NULL'},
    '{country}',
    {f"'{region}'" if region else 'NULL'},
    {f"'{website_url}'" if website_url else 'NULL'},
    {f"'{phone}'" if phone else 'NULL'},
    {f"'{email}'" if email else 'NULL'},
    {google_rating if google_rating is not None else 'NULL'}
);"""
            
            sql_statements.append(sql)
    
    # Write SQL file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(sql_statements))
    
    print(f"Generated {output_file} with {len(sql_statements) - 4} INSERT statements")
    return len(sql_statements) - 4

if __name__ == "__main__":
    count = process_us_csv()
    print(f"Processed {count} dive shops from US")
    print("Migration file ready for database import!")
