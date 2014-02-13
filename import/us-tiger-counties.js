/**
 * Download county GIS files from https://data2.nhgis.org/main.
 * 1. Select the "County (by State)" Geographic level in the upper left filters.
 * 2. Use the "GIS boundary files" tab below to browse through and select files by year (use the latest TIGER/Line basis available).
 * 3. Convert with:
 *      ogr2ogr -f GeoJSON -s_srs EPSG:102003 -t_srs WGS84 -a_srs WGS84 <outputfile>.geojson <inputfile>.shp
 */