1. Download county GIS files from https://data2.nhgis.org/main
    1. Select the "County (by State)" Geographic level in the upper left filters
    1. Use the "GIS boundary files" tab below to browse through and select files by year (use the latest TIGER/Line basis available)
1. Unzip and convert to geojson with `node import/nhgis/nhgis-generate-county-geojson.sh download.zip`
1. Extract counties into intermediary OPD files with `node import/nhgis/nhgis-counties-extract.js --source <dir> --dest <dir>`
1. Send counties to OPD with `node import/nhgis/nhgis-counties-save.js -u <opduser> -p <opdpass> --host <opdhost> --source <dir>`
    * The source directory in this step should match the destination directory in the previous step 
