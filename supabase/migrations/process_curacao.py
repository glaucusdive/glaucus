#!/usr/bin/env python3
"""
Process Curaçao dive shops CSV and generate SQL INSERT statements
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

def process_curacao_csv():
    """Process Curaçao CSV and generate SQL"""
    
    csv_file = "csvfiles/Curacao Scub Shops 8.19.25.csv"
    output_file = "curacao_import.sql"
    
    sql_statements = []
    sql_statements.append("-- Curaçao Dive Shops Import")
    sql_statements.append("-- Generated from: Curacao Scub Shops 8.19.25.csv")
    sql_statements.append("")
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Map CSV columns to database schema
            business_name = clean_text(row.get('Shop', ''))
            street_address = None  # No address data in this CSV
            locale = 'Curaçao'  # Set default locale
            country = 'Curaçao'
            region = 'Curaçao'  # Set default region
            website_url = None  # No website data in this CSV
            phone = None  # No phone data in this CSV
            email = None  # No email data in this CSV
            google_rating = clean_rating(row.get('Google_Rating', ''))
            
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
    count = process_curacao_csv()
    print(f"Processed {count} dive shops from Curaçao")
