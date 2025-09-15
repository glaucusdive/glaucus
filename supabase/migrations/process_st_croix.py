#!/usr/bin/env python3
"""
Process St. Croix dive shops CSV and generate SQL INSERT statements
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

def process_st_croix_csv():
    """Process St. Croix CSV and generate SQL"""
    
    csv_file = "csvfiles/St. Croix Scuba Shops 8.19.25.csv"
    output_file = "st_croix_import.sql"
    
    sql_statements = []
    sql_statements.append("-- St. Croix Dive Shops Import")
    sql_statements.append("-- Generated from: St. Croix Scuba Shops 8.19.25.csv")
    sql_statements.append("")
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Map CSV columns to database schema
            business_name = clean_text(row.get('Shop Name', ''))
            street_address = clean_text(row.get('Address', ''))
            locale = clean_text(row.get('Island/Region', ''))
            country = 'United States Virgin Islands'
            region = 'St. Croix'
            website_url = clean_text(row.get('Website', ''))
            phone = None  # No phone data in this CSV
            email = clean_text(row.get('Email', ''))
            google_rating = clean_rating(row.get('Google Rating', ''))
            
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
    '{locale}',
    '{country}',
    '{region}',
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
    count = process_st_croix_csv()
    print(f"Processed {count} dive shops from St. Croix")
