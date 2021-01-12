'use strict';
/**
 *
 */

(function() {


var appCommand = angular.module('gasolinemonitor', ['googlechart', 'ui.bootstrap','ngSanitize', 'ngModal', 'ngCookies']);






// --------------------------------------------------------------------------
//
// Controler Ping
//
// --------------------------------------------------------------------------

// Ping the server
appCommand.controller('GasolineControler',
	function ( $http, $scope,$sce, $cookies ) {

	
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
	this.getListEvents = function ( listevents ) {
		return $sce.trustAsHtml(  listevents);
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
		self.listeventssave=''; 
		self.saving=true;
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
	}
	
	/**
	 * remove
	 */
	this.removeQuery = function() {
		var self=this;
		if (! confirm("Would you like to remove this query ?"))
			return;
		self.listeventssave=''; 
		var json= encodeURI( angular.toJson(this.currentquery, false));
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
		self.listeventstest='';
		self.listeventssave='';
		self.executing=true;
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
		if (this.resulttestquery.rows && this.resulttestquery.rows.length > 0)
		{
			var firstline =  this.resulttestquery.rows[ 0 ];
			return firstline;
		}
		return {};
	}

});



})();