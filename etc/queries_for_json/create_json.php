<?php

echo "Running script...\n";
echo "... Args: " . print_r($argv, true);

$l_sCommand = $argv[1];

$g_sDbHost = "127.0.0.1";
$g_sDbName = "h4g";
$g_sDbUser = "root";
$g_sDbPass = "";

$mysqli = new mysqli($g_sDbHost, $g_sDbUser, $g_sDbPass, $g_sDbName);
if ( $mysqli->connect_errno) {
    printf("Connect failed: %s\n", $mysqli->connect_error);
    exit();
}

switch ($l_sCommand) {
    case 'campaign':
            renderCampaignJson();
            break;
    case 'projects':
            renderProjectsJson();
            break;
    case 'countries':
            renderCountriesJson();
            break;
    case 'donations':
            $l_sRequestedQuarter = $argv[2];
            renderDonationJson($l_sRequestedQuarter);
            break;
}








function renderCampaignJson(){
    global $mysqli;
    $l_sSql = sprintf("SELECT
                        	campaign_id,
                        	if (c.create_dttm IS NOT NULL, CONCAT(YEAR(c.create_dttm),QUARTER(c.create_dttm)),'') as start_quarter_code,
                        	if (end_dt IS NOT NULL, CONCAT(YEAR(end_dt),QUARTER(end_dt)),'') as end_quarter_code,
                        	fi.countries_csv AS country_code
                        FROM mycw_campaign c
                        LEFT JOIN funding_initiative fi ON c.funding_initiative_id = fi.funding_initiative_id
                        WHERE 
                        	c.delete_dttm is NULL
                        	;");

    if ($result = $mysqli->query($l_sSql)) {
       // printf("Select returned %d rows.\n", $result->num_rows);
        
        _dumpToJson($result, 'campaigns.json', 'water_campaigns');
        /* free result set */
        $result->close();
    }
}


function renderProjectsJson(){
    global $mysqli;
    $l_sSql = sprintf("SELECT 
                        	id,
                        	latitude,
                        	longitude,
                        	if (completion_date IS NOT NULL, CONCAT(YEAR(completion_date),QUARTER(completion_date)),'') as quarter_code
                        FROM projects
                        WHERE 
                        	status_id = 3
                        ;");

    if ($result = $mysqli->query($l_sSql)) {
       // printf("Select returned %d rows.\n", $result->num_rows);
        
        _dumpToJson($result, 'projects.json', 'water_projects');
        /* free result set */
        $result->close();
    }
}


function renderCountriesJson(){
    global $mysqli;
    $l_sSql = sprintf("SELECT
                        	iso_2,
                        	latitude,
                        	longitude
                        FROM countries
                        ORDER BY iso_2 ASC;");

    if ($result = $mysqli->query($l_sSql)) {
       // printf("Select returned %d rows.\n", $result->num_rows);
        
        _dumpToJson($result, 'countries.json', 'water_countries');
        /* free result set */
        $result->close();
    }
}


function renderDonationJson($p_sQuarter){
    global $mysqli;
    
    $l_sSql = sprintf("SELECT 
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
                        	AND CONCAT(YEAR(d.create_dttm),QUARTER(d.create_dttm)) = '%s'", $p_sQuarter);

    if ($result = $mysqli->query($l_sSql)) {
       // printf("Select returned %d rows.\n", $result->num_rows);
        
        _dumpToJson($result, 'donations_' . $p_sQuarter . '.json', 'water_donations', $p_sQuarter);
        /* free result set */
        $result->close();
    }
}






function _dumpToJson($result, $p_sFilename, $p_sMethod = "placeholder_callback", $p_xSecondParam = null){
    if (empty($result)) {
        return;
    }
    
    $myFile = $p_sFilename;
    $fh = fopen($myFile, 'w') or die("can't open file");
    $stringData = "$p_sMethod([";
    fwrite($fh, $stringData);

    // FIRST ROW AND HEADER
    $l_aFirstRow = $result->fetch_assoc();
    debug( "HEADER: " . print_r(  $l_aFirstRow , true) );
    $l_aHeaderValues = array_keys($l_aFirstRow);
    $l_sString = json_encode($l_aHeaderValues);
    fwrite($fh, $l_sString);
    
    
    debug( "FIRST ROW: " . print_r( $l_aFirstRow, true ) ); 
    $l_aValues = array_values($l_aFirstRow);
    $l_sString = json_encode($l_aValues);
    fwrite($fh, "\n," . $l_sString);
    
    while ($l_aRow = $result->fetch_row() ) {
        debug("ROW: " . print_r( $l_aRow, true )); 
        $l_aValues = array_values($l_aRow);
        $l_sString = json_encode($l_aValues);
        debug("ROW AS JSON: " . $l_sString);
        fwrite($fh, "\n," . $l_sString);
    }
    
    if (!empty($p_xSecondParam)){
        $stringData = "," . $p_xSecondParam;
        fwrite($fh, $stringData);
    }
    
    $stringData = "])";
    fwrite($fh, $stringData);
    
    fclose($fh);
    
    debug("DONE\n");
}

function debug($p_sMessage){
    // echo $p_sMessage;
}

$mysqli->close();

?>