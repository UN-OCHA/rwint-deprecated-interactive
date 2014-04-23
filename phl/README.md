stats
=====

Site displaying ReliefWeb statistics

Geojson creation
================

mapshaper -f topojson --keep-shapes --modified --auto-snap --precision 0.001 -p 0.2 --filter "ISO_3 !== 'ATA'" -e "iso3=(STATUS.indexOf('Occupied Territory') === 0 ? 'PSE' : ISO_3), name=Terr_Name, delete OBJECTID, delete ISO_3, delete STATUS, delete COLOR_CODE, delete Terr_ID, delete Terr_Name, delete Shape_Leng, delete Shape_Area" --encoding utf8 -o world.un.json wrl_polbnda_int_15m_uncs/wrl_polbnda_int_15m_uncs.shp
