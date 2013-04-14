-- Four Data files:
-- Campaigns
-- Projects
-- Countries
-- Donation Assignments



-- campaigns
SELECT
	campaign_id,
	if (c.create_dttm IS NOT NULL, CONCAT(YEAR(c.create_dttm),QUARTER(c.create_dttm)),"") as start_quarter_code,
	if (end_dt IS NOT NULL, CONCAT(YEAR(end_dt),QUARTER(end_dt)),"") as end_quarter_code,
	fi.countries_csv AS country_code
FROM mycw_campaign c
LEFT JOIN funding_initiative fi ON c.funding_initiative_id = fi.funding_initiative_id
WHERE 
	c.delete_dttm is NULL;
	
-- PROJECTS
SELECT 
	id,
	latitude,
	longitude,
	if (completion_date IS NOT NULL, CONCAT(YEAR(completion_date),QUARTER(completion_date)),"") as quarter_code
FROM projects
WHERE 
	status_id = 3
;

-- countries
SELECT
	iso_2,
	latitude,
	longitude
FROM countries
ORDER BY iso_2 ASC;



-- DONATION ASSIGNMENTS
-- 
-- NOTE: Change the create_dttm range as per requested quarter.
SELECT 
 	d2p.assigned_amt, 
	d2p.project_id,
	d.campaign_id,
	UNIX_TIMESTAMP(d.create_dttm) as donation_date,
	if (d.anonymous_ind = 'N', z.`lat`,	NULL) as source_lat,
	if (d.anonymous_ind = 'N', z.`lon`,	NULL) as source_long
FROM mycw_payment d
LEFT JOIN donations_projects d2p ON d.payment_id = d2p.donation_id
LEFT JOIN zips z ON d.`country_cd` = z.country_cd AND d.`postal_cd_tx` = z.postal_cd
WHERE
	d.delete_dttm IS NULL
	AND d.create_dttm > '2010-01-01'
	AND d.create_dttm <= '2010-04-01';