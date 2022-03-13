package org.bonitasoft.gasoline;

import org.bonitasoft.log.event.BEvent;
import org.bonitasoft.log.event.BEvent.Level;
import org.bonitasoft.log.event.BEventFactory;
import org.bonitasoft.properties.BonitaProperties;
import org.json.simple.JSONValue;

import java.io.*;
import java.sql.Clob;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.Map.Entry;
import java.util.logging.Logger;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

public class GasolineAPI {

    private static final String CST_OLD_ID = "oldId";
    private static final String CST_ID = "id";
    private static final String CST_PAGENAME_GAZOLINEQUERY = "custompage_gasolinetruck";
    private static final String CST_GAZOLINEQUERY_JSON = "gazolinequery.json";
    
    private static Logger logger = Logger.getLogger(GasolineAPI.class.getName());
    static DateTimeFormatter dtfDay = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    static DateTimeFormatter dtfHour = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'");
    static DateTimeFormatter dtfHourAbsolute = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static BEvent EventExportFailed = new BEvent(GasolineAPI.class.getName(), 1, Level.APPLICATIONERROR, "Export failed", "The export failed", "The zip file is not delivered", "check the exception");
    private static BEvent EventPageDirectoryExportFailed = new BEvent(GasolineAPI.class.getName(), 2, Level.ERROR, "Export failed", "The export failed", "The zip file is not delivered", "check the exception");
    private static BEvent EventFileUploadedNotFound = new BEvent(GasolineAPI.class.getName(), 3, Level.ERROR, "Temporary file not found", "The temporary file updloaded is not found", "The import failed",
            "Search where the temporary file is and updload the software (it seem that the Bonita Portal choose a different path again ? )");
    private static BEvent EventConfigurationStructureFailed = new BEvent(GasolineAPI.class.getName(), 4, Level.APPLICATIONERROR, "Import file incorrect", "The import file has an incorrect structure", "The import failed", "Check the file");
    private static BEvent EventQueriesImported = new BEvent(GasolineAPI.class.getName(), 5, Level.SUCCESS, "Queries imported", "The import is done with success");
     
    

    public static String[]  CST_QUERYLISTATTRIBUTES = new String[]{
                                      "sql",
                                      "datasource",
                                      "expl",
                                      "profilename",
                                      "testparameters",
                                      "delayms",
                                      "simulationmode",
                                      "simulationresult",
                                      "simulationdelayms"
    };

    // --------------------------------------------------------------
    // 
    // LoadQueries
    // 
    // --------------------------------------------------------------

   

    /**
     * load all queries
     * populate the listQueries and the listEvents
     */
    public static void loadQueries( List<Map<String,String>> listQueries,  List<BEvent> listEvents, Long tenantId)
    {
       BonitaProperties bonitaProperties = new BonitaProperties( CST_PAGENAME_GAZOLINEQUERY, tenantId );

        listEvents.addAll( bonitaProperties.load() );
        logger.info("LoadBonitaProperties done, events = "+listEvents.size());


        Set<String> setqueriesid = decodeListQuery( bonitaProperties.getProperty( "listqueries" ) );

        for (String id : setqueriesid) {
            Map<String,String> oneQuery = new HashMap<>();
            oneQuery.put(CST_ID, id );
            oneQuery.put(CST_OLD_ID, id );
            for (String attr : CST_QUERYLISTATTRIBUTES)
            {
                oneQuery.put( attr, bonitaProperties.getProperty( id+"_"+attr ));
            }
            listQueries.add( oneQuery );
        }
        return;

    }
    public static void saveQuery( Map<String,String> jsonHash,  List<BEvent> listEvents, long tenantId) {
        BonitaProperties bonitaProperties = new BonitaProperties( CST_PAGENAME_GAZOLINEQUERY, tenantId );

        listEvents.addAll( bonitaProperties.load() );

        internalSaveQuery( jsonHash, listEvents, bonitaProperties);
        listEvents.addAll(  bonitaProperties.store());

    }
        
    /**
     * 
     * @param jsonHash
     * @param listEvents
     * @param bonitaProperties
     */
    public static void internalSaveQuery( Map<String,String> jsonHash,  List<BEvent> listEvents, BonitaProperties bonitaProperties) {
    
    try {
      

        // replace the old id by the new one
        Set<String> setqueriesid = decodeListQuery( bonitaProperties.getProperty( "listqueries" ) );

        String oldId= jsonHash.get(CST_OLD_ID);
        String id= jsonHash.get(CST_ID);

        logger.info("Id["+id+"] oldId["+oldId+"] Id exist ? "+setqueriesid.contains(id)+" setqueriesid["+setqueriesid+"]");

        if (setqueriesid.contains(id) && (oldId==null || ! oldId.equals( id ) ))
        {
            // the new ID already exist
            listEvents.add( new BEvent("org.bonitasoft.gasoline", 4, Level.APPLICATIONERROR, "ID already exist", "This ID already exist, and you can't have 2 requests with the same ID", "The query is not saved", "Change and choose an new id"));
        }
        else
        {
            if (oldId!=null && ! oldId.equals( id ) )
            {
                // remove the oldId in the list
                logger.info("Id change, remove the oldid["+oldId+"] in ["+setqueriesid+"]");
                setqueriesid.remove(oldId );

                logger.info("new listQueriesId["+setqueriesid+"]");
                for (String attr : CST_QUERYLISTATTRIBUTES)
                {
                    bonitaProperties.remove( oldId+"_"+attr);
                }
            }
            setqueriesid.add( id );

            logger.info("new listqueriesid["+setqueriesid+"]");

            for (String attr : CST_QUERYLISTATTRIBUTES)
            {
                logger.info("Save attr["+attr+"] value=["+ jsonHash.get(attr)+"]");
                
                bonitaProperties.setProperty( id+"_"+attr, (jsonHash.get(attr)==null ? "" :  jsonHash.get(attr)));
            }
            bonitaProperties.setProperty( "listqueries", codeListQueries( setqueriesid ));

    
           

        }
    }
    catch( Exception e ) {
        StringWriter sw = new StringWriter();
        e.printStackTrace(new PrintWriter(sw));
        String exceptionDetails = sw.toString();
        logger.severe("SaveQuery:Exception "+e.toString()+" at "+exceptionDetails);

        listEvents.add( new BEvent("org.bonitasoft.ping", 2, Level.APPLICATIONERROR, "Error using BonitaProperties", "Error :"+e.toString(), "Properties is not saved", "Check exception"));
    }
    }
    
    public static String codeListQueries(Set<String> listQueries) {
        String list = "";
        boolean sep = false;
        for (String key : listQueries) {
            list = list + (sep ? "#" : "") + key;
            sep = true;
        }
        return list;
    }
    // --------------------------------------------------------------
    // 
    // Export/Import
    // 
    // --------------------------------------------------------------


    public static List<BEvent> importQueries(String fileName, File pageDirectory, Long tenantId) {

        List<BEvent> listEvents = new ArrayList<>();
        BonitaProperties bonitaProperties = new BonitaProperties( CST_PAGENAME_GAZOLINEQUERY, tenantId );
        bonitaProperties.setCheckDatabase(false);
        listEvents.addAll( bonitaProperties.load() );


        if (BEventFactory.isError(listEvents))
            return listEvents;

        List<String> listParentTmpFile = new ArrayList<>();
        try {
            listParentTmpFile.add(pageDirectory.getCanonicalPath() + "/../../../tmp/");
            listParentTmpFile.add(pageDirectory.getCanonicalPath() + "/../../");
        } catch (Exception e) {
            listEvents.add(new BEvent(EventPageDirectoryExportFailed, e, ""));
            logger.info("SnowMobileAccess : error get CanonicalPath of pageDirectory[" + e.toString() + "]");
            return listEvents;
        }
        File completefileName = null;
        String allPathChecked = "";
        for (String pathTemp : listParentTmpFile) {
            allPathChecked += pathTemp + fileName + ";";
            if (fileName.length() > 0 && (new File(pathTemp + fileName)).exists()) {
                completefileName = (new File(pathTemp + fileName)).getAbsoluteFile();
                logger.info("GasolineAPI.importConfs : FOUND [" + completefileName + "]");
            }
        }

        if (!completefileName.exists()) {
            listEvents.add(new BEvent(EventFileUploadedNotFound, "File[" + fileName + "] not found in path[" + allPathChecked + "]"));
            return listEvents;
        }

        
        List<Map<String,String>> listQueries = new ArrayList<>();
        int numberOfQueryImported=0;
   
        
        boolean foundImportFile = false;
        ZipInputStream zis = null;
        try {
            zis = new ZipInputStream(new FileInputStream(completefileName));

            // get the zipped file list entry
            ZipEntry ze = zis.getNextEntry();

            while (ze != null) {
                if (ze.getName().equals(CST_GAZOLINEQUERY_JSON)) {
                    foundImportFile = true;
                    final byte[] buffer = new byte[1024];

                    final ByteArrayOutputStream bosBuffer = new ByteArrayOutputStream();
                    int len = 0;
                    while ((len = zis.read(buffer)) > 0) {
                        bosBuffer.write(buffer, 0, len);
                    }
                    String fileContentJson = bosBuffer.toString("UTF-8");

                    // import now
                    Object queryObject = JSONValue.parse(fileContentJson);
                    
                    if (queryObject instanceof List) {
                        // loadQueries(listQueries, listEvents, tenantId);
                        // add all this new query
                        for (Map<String,Object> queryToImport : (List<Map<String,Object>>) queryObject) {
                            // deal with the ID : new ID? Merge ?
                            Map<String,String> queryProperties = new HashMap<>();
                            // we copy only the attributes
                            for (String key : CST_QUERYLISTATTRIBUTES) {
                                Object keyValue = queryToImport.get( key );
                                if (keyValue!=null)
                                    queryProperties.put(key, keyValue.toString());
                            }
                            queryProperties.put(CST_ID,(String)queryToImport.get(CST_ID));
                            // setup the oldId : if the ID already exist, it will be overrided
                            queryProperties.put(CST_OLD_ID,(String)queryToImport.get(CST_ID));
                            internalSaveQuery( queryProperties, listEvents, bonitaProperties);
                            numberOfQueryImported++;
                            
                        }
                        listEvents.addAll(bonitaProperties.store());
                    }
                    bosBuffer.close();
                }
                ze = zis.getNextEntry();
            }
            zis.close();

            if (!foundImportFile) {
                listEvents.add(new BEvent(EventConfigurationStructureFailed, "file[" + CST_GAZOLINEQUERY_JSON + "] not found in the Zip file;"));
            } else
                listEvents.add(new BEvent(EventQueriesImported, numberOfQueryImported + " query imported"));

        } catch (final IOException ie) {
            listEvents.add(new BEvent(EventConfigurationStructureFailed, ie, ""));

        } catch (final Exception e) {
            final StringWriter sw = new StringWriter();
            e.printStackTrace(new PrintWriter(sw));
            final String exceptionDetails = sw.toString();
            logger.severe("MeteorDAO.Import : exception:"+e.getMessage()+" at " + exceptionDetails);
            listEvents.add(new BEvent(EventConfigurationStructureFailed, e, ""));

        } finally {
            if (zis != null) {
                try {
                    zis.close();
                } catch (final IOException e1) {
                }
            }

        }

      
        return listEvents;
    }

    public static OutputStream exportQueries( List<BEvent> listEvents, long tenantId) {
        ByteArrayOutputStream containerZip = new ByteArrayOutputStream();
        try {
            ZipOutputStream zos = new ZipOutputStream( containerZip );
            ZipEntry ze = new ZipEntry(CST_GAZOLINEQUERY_JSON);
            zos.putNextEntry(ze);

            List<Map<String,String>> listQueries = new ArrayList<>();
            loadQueries( listQueries,  listEvents, tenantId);
            String exportSentence = JSONValue.toJSONString(listQueries);

            
            zos.write(exportSentence.getBytes());

            zos.closeEntry();

            // remember close it
            zos.close();
            logger.info("Gasoline.exportconf: end of exportConf ["+exportSentence+"]");
        } catch (IOException e) {
            final StringWriter sw = new StringWriter();
            e.printStackTrace(new PrintWriter(sw));
            final String exceptionDetails = sw.toString();

            logger.severe("Gasoline.exportconf: exportConf exception:"+e.getMessage()+" at "+exceptionDetails);

            listEvents.add(new BEvent(EventExportFailed, e, "export"));
        }
        return containerZip;
    }
    
    

    // --------------------------------------------------------------
    // 
    // Private method
    // 
    // --------------------------------------------------------------


    private static Set<String> decodeListQuery(String listqueriesString) {
        Set<String> listQueries = new HashSet<>();
        if (listqueriesString == null)
            return listQueries;
        StringTokenizer st = new StringTokenizer(listqueriesString, "#");

        while (st.hasMoreTokens()) {
            String id = st.nextToken();
            listQueries.add(id);
        }
        return listQueries;
    }

    
    
    private static List<Map<String, Object>> translateToJson(List<Map<String, Object>> answerRows) {
        if (answerRows ==null) {
            return answerRows;

        }

        for (Map<String, Object> row : answerRows) {
            Map<String, Object> translateRow = new HashMap<String, Object>();
            for (Entry<String, Object> entry : row.entrySet()) {
                Object o = entry.getValue();
                logger.info("Key[" + entry.getKey() + "] Object [" + o + "] -" + (o == null ? "null" : o.getClass().getName()));
                if (o == null
                        || (o instanceof String)
                        || (o instanceof Long)
                        || (o instanceof Integer)
                        || (o instanceof Float)
                        || (o instanceof Double))
                    continue;
                logger.info("TRANSLATION for  Key[" + entry.getKey() + "]");

                if (o instanceof Clob) {
                    translateRow.put(entry.getKey(), clobToString((Clob) o));
                } else if (o instanceof java.time.LocalDate) {
                    translateRow.put(entry.getKey(), dtfDay.format((java.time.LocalDate) o));
                } else if (o instanceof java.time.OffsetDateTime) {
                    translateRow.put(entry.getKey(), dtfHourAbsolute.format((java.time.OffsetDateTime) o));
                } else if (o instanceof java.time.LocalDateTime) {
                    translateRow.put(entry.getKey(), dtfHourAbsolute.format((java.time.LocalDateTime) o));
                } else {
                    translateRow.put(entry.getKey(), o.toString());
                }
            }
            logger.info("Translation [" + translateRow.toString() + "]");
            for (Entry<String, Object> entry : translateRow.entrySet()) {
                row.put(entry.getKey(), entry.getValue());
            }
        }
        return answerRows;

    }

    private static String clobToString(Clob clobObject) {
        try {
            InputStream in = clobObject.getAsciiStream();

            Reader read = new InputStreamReader(in);
            StringWriter write = new StringWriter();

            int c = -1;
            while ((c = read.read()) != -1) {
                write.write(c);
            }
            write.flush();
            return write.toString();
        } catch (Exception e) {
            logger.severe("Gasoline: Error when reading a CLOB object " + e.toString());

            return null;
        }
    }
}
