'use strict';
/**
 *
 */

(function() {


var appCommand = angular.module('gasolinemonitor', ['googlechart', 'ui.bootstrap','ngSanitize', 'ngModal', 'ngCookies', 'angularFileUpload']);






// --------------------------------------------------------------------------
//
// Controler Ping
//
// --------------------------------------------------------------------------

// Ping the server
appCommand.controller('GasolineControler',
	function ( $http, $scope, $sce, $cookies, $upload ) {

	
	// --------------------------------------------------------------------------
	//
	//  General
	//
	// --------------------------------------------------------------------------

	this.isshowhistory = false;
	this.showhistory = function( showhistory ) {
		this.isshowhistory = showhistory;
	};
	
	this.listevents = '';
	this.listeventsImported='';
	this.listeventssave=''; 
	this.listeventstest='';


	this.getListEvents = function ( listevents ) {
		return $sce.trustAsHtml(  listevents);
	}
	
	this.clearEvents = function() {
		this.listeventsImported='';
		this.listevents='';
		this.listeventssave='';
		this.listeventstest='';
	}
	this.getHttpConfig = function () {
		var additionalHeaders = {};
		var csrfToken = $cookies.get('X-Bonita-API-Token');
		if (csrfToken) {
			additionalHeaders ['X-Bonita-API-Token'] = csrfToken;
		}
		var config= {"headers": additionalHeaders};
		console.log("GetHttpConfig : "+angular.toJson( config));
		return config;
	}
	// --------------------------------------------------------------------------
	//
	//  Manage the query
	//
	// --------------------------------------------------------------------------
	this.listqueries= [];
	this.newQuery = function()
	{
		this.currentquery= { 'id':'New query'};
		this.listqueries.push(  this.currentquery );
		this.resulttestquery ={};
		this.isshowDialog=true;
		this.openQueryPanel();
		
	}
	
	this.editQuery = function( queryinfo ) {
		this.currentquery=queryinfo;
		this.resulttestquery ={};
		this.isshowDialog=true;
		this.openQueryPanel();
	};
	
	this.loading=false;
	this.saving=false;
	this.executing=false;
	
	this.loadQueries =function() {
		var self=this;
		this.clearEvents();
		self.loading=true;
		var d = new Date();
		
		$http.get( '?page=custompage_gasolinetruck&action=loadqueries&t='+d.getTime(), this.getHttpConfig()  )
				.success( function ( jsonResult ) {
						console.log("history",jsonResult);
						self.listqueries 	= jsonResult.listqueries;
						self.listprofiles 	= jsonResult.listprofiles;
						self.listevents		= jsonResult.listevents;
						self.loading=false;
				})
				.error( function() {
					self.loading=false;
					// alert('an error occure on load');
					});
	}
	this.loadQueries();

	this.currentquery ={ 'id':'',  'sql':'',    'datasource':'java:comp/env/', 'expl' :'', 'testparameters':'', 'simulationmode':'never'};

	
	/**
	 * Save the query
	 */
	this.saveQuery = function() {
		var self=this;
		this.clearEvents();
		self.saving=true;
		
		this.sendPost("savequery",this.currentquery, this.saveQueryCallback);
		
		/*
		var json= encodeURI( angular.toJson(this.currentquery, false));
		var d = new Date();
		$http.get( '?page=custompage_gasolinetruck&action=savequery&paramjson='+json+'&t='+d.getTime(), this.getHttpConfig()  )
				.success( function ( jsonResult ) {
						console.log("history",jsonResult);
						self.listqueries = jsonResult.listqueries;
						self.listeventssave		= jsonResult.listevents;
						self.currentquery.oldId=jsonResult.id;
						self.saving=false;
				})
				.error( function() {
					// alert('an error occure on save');
					self.saving=false;
					});
		*/
	}
		
	this.saveQueryCallback = function ( jsonResult, self) {
		console.log("saveQueryCallback");
		self.listqueries = jsonResult.listqueries;
		self.listeventssave		= jsonResult.listevents;
		self.currentquery.oldId=jsonResult.id;
		self.saving=false;
	}
	/**
	 * remove
	 */
	this.removeQuery = function() {
		var self=this;
		if (! confirm("Would you like to remove this query ?"))
			return;
		this.clearEvents(); 
		
		var param= {id: this.currentquery.id};
		var json= encodeURI( angular.toJson(param, false));
		
		self.saving=true;
		var d = new Date();	
		
		$http.get( '?page=custompage_gasolinetruck&action=removequery&paramjson='+json+'&t='+d.getTime(), this.getHttpConfig()  )
				.success( function ( jsonResult ) {
						self.listqueries = jsonResult.listqueries;
						self.closeDialog();
						self.closeQueryPanel();			
						self.saving=false;
				})
				.error( function() {
					// alert('an error occure on remove');
					self.saving=false;
					
					});
		
	}
	
	
	/**
	 * Test the query
	 */
	this.executing=false;
	this.testQuery = function() {
		var self=this;
		this.clearEvents(); 

		self.executing=true;	
		var param = angular.fromJson(angular.toJson(this.currentquery));
		param.testparameters= this.testparameters;
						
		this.sendPost("testquery", param, this.testQueryCallback);
	
		/*
		console.log("angular currentQuery="+angular.toJson(this.currentquery, false));
		
		var json= encodeURI( angular.toJson(this.currentquery, false));
		var d = new Date();	
		var url = '?page=custompage_gasolinetruck&action=testquery&paramjson='+json+'&t='+d.getTime();
		if (this.testparameters)
			url = url+'&'+this.testparameters;
			
		
		$http.get( url, this.getHttpConfig()  )
				.success( function ( jsonResult ) {
						console.log("testquery",jsonResult);
						self.resulttestquery = jsonResult;
						self.listeventstest= jsonResult.listevents;
						self.executing=false;
				})
				.error( function() {
					self.executing=false;
					// alert('an error occure');
					});
					*/
	}
		
	this.testQueryCallback = function ( jsonResult, self) {
		console.log("saveQueryCallback");
		self.resulttestquery = jsonResult;
		self.listeventstest= jsonResult.listevents;
		self.executing=false;		
	}
	// --------------------------------------------------------------------------
	//
	//  Manage the panel
	//
	// --------------------------------------------------------------------------
	this.showQueryPanel=false;
	this.isshowQueryPanel = function()
	{
		return this.showQueryPanel;
	}
	this.closeQueryPanel = function()
	{
		this.showQueryPanel=false;
	}
	this.openQueryPanel = function()
	{
		console.log("Open query panel");
		this.showQueryPanel=true;
	}
	this.getListStyle = function()
	{
		if (this.showQueryPanel)
			return "filter:alpha(opacity=50); opacity:0.5;";
		return "";
	}
	
	// -----------------------------------------------------------------------------------------
	// Thanks to Bonita to not implement the POST : we have to split the URL
	// -----------------------------------------------------------------------------------------
	var postParams=
	{
		"listUrlCall" : [],
		"action":"",
		"callbackfct ": null,
		"advPercent":0
		
	}
	this.sendPost = function(actionToServer,  param , callbackfct )
	{
		var self=this;
		self.inprogress=true;
		console.log("sendPost inProgress<=true action="+actionToServer+" Json="+ angular.toJson( param ));
		console.log("updateModelCallback marker ="+self.marker);

		var json = angular.toJson( param, false);

		self.postParams={};
		self.postParams.action= actionToServer;
		self.postParams.listUrlCall=[];
		self.postParams.callbackfct = callbackfct;
		var action = "collectReset";
		// split the string by packet of 1800 (URL cut at 2800, and we have
		// to encode the string)
		while (json.length>0)
		{
			var jsonSplit= json.substring(0,1500);
			var jsonEncodeSplit = encodeURIComponent( jsonSplit );
			
			// Attention, the char # is not encoded !!
			jsonEncodeSplit = jsonEncodeSplit.replace(new RegExp('#', 'g'), '%23');

			
			console.log("collectAdd JsonPartial="+jsonSplit);
			// console.log("collect_add JsonEncode ="+jsonEncodeSplit);
		
			
			self.postParams.listUrlCall.push( "action="+action+"&paramjsonpartial="+jsonEncodeSplit);
			action = "collectAdd";
			json = json.substring(1500);
		}
		self.postParams.listUrlCall.push( "action="+self.postParams.action);
		
		
		self.postParams.listUrlIndex=0;
		self.executeListUrl( self ) // , self.listUrlCall, self.listUrlIndex
									// );
		// this.operationTour('updateJob', plugtour, plugtour, true);
		// console.log("sendPost.END")
		
	}
	
	this.executeListUrl = function( self ) // , listUrlCall, listUrlIndex )
	{
		console.log("executeListUrl: "+(self.postParams.listUrlIndex+1) +"/"+ self.postParams.listUrlCall.length+" : "+self.postParams.listUrlCall[ self.postParams.listUrlIndex ]);
		self.postParams.advPercent= Math.round( (100 *  self.postParams.listUrlIndex) / self.postParams.listUrlCall.length);
		
		// console.log("executeListUrl call HTTP");

		$http.get( '?page=custompage_bookmobile&t='+Date.now()+'&'+self.postParams.listUrlCall[ self.postParams.listUrlIndex ], this.getHttpConfig() )
		.success( function ( jsonResult, statusHttp, headers, config ) {
			// connection is lost ?
			if (statusHttp==401 || typeof jsonResult === 'string') {
				console.log("Redirected to the login page ! statusHttp=" +statusHttp+" jsonResult=["+jsonResult+"]");
				window.location.reload();
			}
			// console.log("executeListUrl receive data HTTP");
			// console.log("Correct, advance one more",
			// angular.toJson(jsonResult));
			console.log("postResultSuccess marker ="+self.marker);

			self.postParams.listUrlIndex = self.postParams.listUrlIndex+1;
			if (self.postParams.listUrlIndex  < self.postParams.listUrlCall.length )
				self.executeListUrl( self );
			else
			{
				self.inprogress = false;
				self.postParams.advPercent= 100; 
				console.log("sendPost finish inProgress<=false jsonResult="+ angular.toJson(jsonResult));
				if (self.postParams.callbackfct) {
					self.postParams.callbackfct(  jsonResult, self  );
				} 
			}
		})
		.error( function(jsonResult, statusHttp, headers, config) {
			console.log("executeListUrl.error HTTP statusHttp="+statusHttp);
			// connection is lost ?
			if (statusHttp==401) {
				console.log("Redirected to the login page !");
				window.location.reload();
			}
			self.inprogress = false;				
			});	
	};
	
	// --------------------------------------------------------------------------
	//
	//  Manage the modal
	//
	// --------------------------------------------------------------------------

	this.isshowDialog=false;
	this.openDialog = function()
	{
		this.isshowDialog=true;
	};
	this.closeDialog = function()
	{
		this.isshowDialog=false;
	};
	
	this.testdisplay='list';
	
	this.currenttab="query";
	this.setTab = function( tab ) {
		document.getElementById( this.currenttab ).className ='';
		this.currenttab = tab;
		document.getElementById( this.currenttab ).className ='active';
	};
	this.getHeaderResultTest = function() {
		if (this.resulttestquery && this.resulttestquery.rows && this.resulttestquery.rows.length > 0)
		{
			var firstline =  this.resulttestquery.rows[ 0 ];
			var listCols= [];
			 angular.forEach( firstline, function (value, key) {
				 console.log("key="+key);
				 if (key !== "$$hashKey")
					 listCols.push( key );
			} );
			 console.log("listCols = "+angular.toJson( listCols));
			return listCols;
		}
		return [];
	}

	// --------------------------------------------------------------------------
	//
	//  Upload file
	//
	// --------------------------------------------------------------------------
	this.fileIsDropped = function( testfileimported ) {
		var self=this;
		this.clearEvents();
		console.log("fileIsDropped : This="+this+" me="+me);
		self.wait=true;
		$http.get( '?page=custompage_gasolinetruck&action=import&filename='+testfileimported+'&t='+Date.now(), this.getHttpConfig() )
		.success( function ( jsonResult, statusHttp, headers, config ) {
				
			// connection is lost ?
			if (statusHttp==401 || typeof jsonResult === 'string') {
				console.log("Redirected to the login page !");
				window.location.reload();
			}
			console.log("Retoir fileIsDropped"); 
			// here the refresh
			self.listqueries 		= jsonResult.listqueries;
			self.listevents			= jsonResult.listevents;
			self.wait=false;
		})
		.error( function ( jsonResult ) {
			self.wait=false});
		
	}
	
	var me = this;
	$scope.$watch('importfiles', function() {
		
		console.log("Watch import file");
		if (! $scope.importfiles) {
			return;
		}
		console.log("Watch import file.lenght="+ $scope.importfiles.length);
		for (var i = 0; i < $scope.importfiles.length; i++) {
			me.wait=true;
			var file = $scope.importfiles[i];
			
			// V6 : url is fileUpload
			// V7 : /bonita/portal/fileUpload
			$scope.upload = $upload.upload({
				url: '/bonita/portal/fileUpload',
				method: 'POST',
				data: {myObj: $scope.myModelObj},
				file: file
			}).progress(function(evt) {
// console.log('progress: ' + parseInt(100.0 * evt.loaded / evt.total) + '% file
// :'+ evt.config.file.name);
			}).success(function(data, status, headers, config) {
			
				console.log('file ' + config.file.name + 'is uploaded successfully. Response: ' + data);
				me.fileIsDropped(data);
			});
		} // end $scope.importfiles
	}); 
});



})();