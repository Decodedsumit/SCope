import _ from 'lodash'
import React, { Component } from 'react'
import { withRouter } from 'react-router-dom';
import { Grid, Input, Icon, Tab, Image, Button, Progress } from 'semantic-ui-react'
import { BackendAPI } from '../common/API'
import Metadata from '../common/Metadata'
import ReactGA from 'react-ga';

import ReactTable from "react-table";
import "react-table/react-table.css";
import FileDownloader from '../../js/http'

import { delimiter } from 'path';

const { FeatureRequest, DownloadSubLoomRequest } = require('../../../bin/s_pb.js');

class ViewerSidebar extends Component {

	constructor() {
		super();
		this.state = {
			activePage: BackendAPI.getActivePage(),
			activeFeatures: BackendAPI.getActiveFeatures(),
			lassoSelections: BackendAPI.getViewerSelections(),
			modalID: null,
			activeTab: 0,
			processSubLoomPercentage: null,
			downloadSubLoomPercentage: null
		};
		this.selectionsListener = (selections) => {
			this.setState({lassoSelections: selections, activeTab: 0});
		};
		this.activeFeaturesListener = (features, id) => {
			this.props.onActiveFeaturesChange(features, id);
			this.setState({activeFeatures: features, activeTab: parseInt(id) + 1});
		};
	}

	render() {
		const { history, match, hideFeatures } = this.props;
		const { lassoSelections, activeFeatures, activeTab, activePage } = this.state;

		let lassoTab = () => {
			if (lassoSelections.length == 0) {
				return (
					<Tab.Pane attached={false} style={{'textAlign': 'center'}} >
						<br /><br />
						No user's lasso selections
						<br /><br /><br />
					</Tab.Pane>
				);
			}

			return (lassoSelections.map((lS, i) => {
				return (
					<Tab.Pane attached={false} style={{'textAlign': 'center'}} key={i}>
					<Grid>
					<Grid.Row columns={3} key={i} className="selectionRow">
						<Grid.Column>
							{"Selection "+ (lS.id + 1)}
						</Grid.Column>
						<Grid.Column>
							<Input
								size='mini'
								style={{width: 75, height: 15}}
								label={{ style: {backgroundColor: '#'+lS.color } }}
								labelPosition='right'
								placeholder={'#'+lS.color}
								disabled
							/>
						</Grid.Column>
						<Grid.Column>
							<Icon name='eye' title='toggle show/hide selection' style={{display: 'inline'}} onClick={(e,d) => this.toggleLassoSelection(lS.id)} style={{opacity: lS.selected ? 1 : .5 }} className="pointer" />
							&nbsp;
							<Icon name='trash' title='remove this selection' style={{display: 'inline'}} onClick={(e,d) => this.removeLassoSelection(i)} className="pointer"  />
							&nbsp;
							<Icon name='search' title='show metadata for this selection' style={{display: 'inline'}} onClick={(e,d) => {
								this.setState({modalID: i});
								this.forceUpdate();
								ReactGA.event({
									category: 'metadata',
									action: 'modal opened',
									value: i
								});
							}} className="pointer"  />
						</Grid.Column>
					</Grid.Row>
					</Grid>
					<br />
					</Tab.Pane>
				)
			}))
		}

		let featureTab = (i) => {

			let colors = ["red", "green", "blue"]
			let metadata = activeFeatures[i] && activeFeatures[i].feature ? "" : <div>No additional information shown for the feature queried in the <b style={{color: colors[i]}}>{colors[i]}</b> query box because it is empty. Additional information (e.g.: cluster markers, regulon motif, regulon target genes, ...) can be displayed here when querying clusters or regulons.<br/><br/></div>;

			if (activeFeatures[i] && activeFeatures[i].metadata) {
				let md = activeFeatures[i].metadata
				let image = md.motifName ? (<Image src={'http://motifcollections.aertslab.org/v8/logos/'+md.motifName} />) : '';
				let markerTable = "", legendTable = "", downloadSubLoomButton = () => "";

				let newMarkerTableColumn = (header, id, accessor, cell) => {
					let column = {
						Header: header,
						id: id,
					}
					if(accessor != null) {
						column["accessor"] = d => d[accessor]
					}
					if(cell != null) {
						column["Cell"] = props => cell(props)
					}
					return column
				}

				if (md.genes) {
					let newMarkerTableGeneCell = (props) => {
						return (
							<a className="pointer"
								onClick={() => {
									let query = {
										loomFilePath: BackendAPI.getActiveLoom(),
										query: props.value
									};
									if (activePage == 'regulon') {
										this.setState({currentPage: 'gene'});
										BackendAPI.setActivePage('gene');
										history.push('/' + [match.params.uuid, match.params.loom ? match.params.loom : '*', 'gene' ].join('/'));
									}
									
									const req = new FeatureRequest();
									req.setLoomFilePath(BackendAPI.getActiveLoom());
									req.setQuery(props.value)

									if (DEBUG) console.log('getFeatures', req);
											
									BackendAPI.getConnection().getFeatures(req, {}, (err, response) => {
										if(err != null) {
											BackendAPI.showError();	
										}
										if (DEBUG) console.log('getFeatures', response);

										if (response !== null) {
											BackendAPI.setActiveFeature(i, activeFeatures[i].type, "gene", props.value, 0, {description: response.getFeatureDescriptionList()[0]});
										}
									})
									
									ReactGA.event({
										category: 'action',
										action: 'gene clicked',
										label: props.value,
										value: i
									});
								}}>{props.value}
							</a>
						)
					}

					// Define the marker table columns
					// Add at least the gene column
					let markerTableColumns = [
						newMarkerTableColumn("Gene Symbol", "gene", "gene", newMarkerTableGeneCell)
					]

					if ('metrics' in md) {
						// Add extra columns (metrics like logFC, p-value, ...)
						for(let metric of md.metrics) {
							markerTableColumns = [...markerTableColumns
												, newMarkerTableColumn(metric.name, metric.accessor, metric.accessor, null)
							]
						}
					}

					let markerTableData = md.genes.map( (g, j) => {
						let markerTableRowData = { gene: g }
						if (!('metrics' in md))
							return markerTableRowData
						for(let metric of md.metrics)
							markerTableRowData[metric.accessor] = metric.values[j]
						return (markerTableRowData)
					});

					let markerTableHeight = screen.availHeight/2.5

					let markerTableHeaderName = () => {
						if(activeFeatures[i].featureType == "regulon")
							return "Regulon Genes"
						else if(activeFeatures[i].featureType.startsWith("Clustering"))
							return "Cluster Markers"

					}, downloadButtonName = () => {
						if(activeFeatures[i].featureType == "regulon")
							return "Download "+ activeFeatures[i].feature +" regulon genes"
						else if(activeFeatures[i].featureType.startsWith("Clustering"))
							return "Download "+ activeFeatures[i].feature +" markers"
					}, genesFileName = () => {
						if(activeFeatures[i].featureType == "regulon")
							return activeFeatures[i].feature +"_regulon_genes.tsv"
						else if(activeFeatures[i].featureType.startsWith("Clustering"))
							return activeFeatures[i].feature +"_markers.tsv"
					};
		
					markerTable = (
						<div style={{marginBottom: "15px", align: "center"}}>
							<ReactTable
								data={markerTableData}
								columns={[
									{
									Header: markerTableHeaderName(),
									columns: markerTableColumns
									}
								]}
								pageSizeOptions={[5, 10, md.genes.length]}
								defaultPageSize={md.genes.length}
								style={{
									height: markerTableHeight +"px" // This will force the table body to overflow and scroll, since there is not enough room
								}}
								className="-striped -highlight"
							/>
							<Button primary onClick={() => {
								const opts = { delimiter: "\t", quote: '' };
								var fileDownload = require('react-file-download');
								const json2csv  = require('json2csv').parse;
								const tsv = json2csv(markerTableData, opts);
								fileDownload(tsv, genesFileName());
							}} style={{marginTop: "10px", width: "100%"}}>
							{downloadButtonName()}
							</Button>
						</div>
					);
				}

				if(this.props.activeLegend != null & activeFeatures[i].featureType == "annotation") {
					let aL = this.props.activeLegend
					let legendTableData = aL.values.map( (v, j) => ({ value: v, color: aL.colors[j] }) )
					let newLegendTableColorCell = (props) => {
						let colorLegendStyle = {
							"width": "25px",
							"height": "25px",
							"-webkit-mask-box-image": "url('src/images/dot.png')",
							"backgroundColor": "#"+ props.value
						}
						return (
							<div style={colorLegendStyle}></div>
						)
					}
					let legendTableColumns = [newMarkerTableColumn("Value", "value", "value", null)
										 	, newMarkerTableColumn("Color", "color", "color", newLegendTableColorCell)]
					legendTable = (
						<div style={{marginBottom: "15px"}}>
							<ReactTable
								data={legendTableData}
								columns={[
									{
									Header: "Legend",
									columns: legendTableColumns
									}
								]}
								pageSizeOptions={[5, 10, 20]}
								defaultPageSize={10}
								className="-striped -highlight"
								/>
						</div>
					);
				}

				if(activeFeatures[i].featureType.startsWith("Clustering")) {
					downloadSubLoomButton = () => {
						if(this.state.downloadSubLoomPercentage == null && this.state.processSubLoomPercentage ==null)
							return (
								<Button color="green" onClick={() => {
									
									const req = new DownloadSubLoomRequest();
									req.setLoomFilePath(BackendAPI.getActiveLoom());
									req.setFeatureType("clusterings")
									req.setFeatureName(activeFeatures[i].featureType.replace(/Clustering: /g, ""))
									req.setFeatureValue(activeFeatures[i].feature)
									req.setOperator("==")

									if (DEBUG) console.log('downloadSubLoom', req);
									let call = BackendAPI.getConnection().downloadSubLoom(req);
									call.on('data', (dsl) => {
										if (DEBUG) console.log('downloadSubLoom data');
										if(dsl == null) {
											this.setState({ loomDownloading: null, downloadSubLoomPercentage: null });
											return
										}
										if (!dsl.getIsDone()) {
											this.setState({ processSubLoomPercentage: Math.round(dsl.getProgress().getValue()*100) });
										} else {
											// Start downloading the subsetted loom file
											let fd = new FileDownloader(dsl.getLoomFilePath(), match.params.uuid, dsl.getLoomFileSize())
											fd.on('started', (isStarted) => {
												this.setState({ processSubLoomPercentage: null, loomDownloading: encodeURIComponent(dsl.getLoomFilePath()) });
											})
											fd.on('progress', (progress) => {
												this.setState({ downloadSubLoomPercentage: progress })
											})
											fd.on('finished', (finished) => {
												this.setState({ loomDownloading: null, downloadSubLoomPercentage: null });
											})
											fd.start()
										}
									});
									call.on('end', () => {
										console.log()
										if (DEBUG) console.log('downloadSubLoom end');
									});
									call.on('error', function(err) {
										console.log('downloadSubLoom error: ' + err.message);
										if(err != null) {
											this.setState({ loomDownloading: null, downloadSubLoomPercentage: null, processSubLoomPercentage: null });
											BackendAPI.showError();	
										}
									});

								}} style={{marginTop: "10px", width: "100%"}}>
								{"Download "+ activeFeatures[i].feature +" .loom file"}
								</Button>
							)
						if(this.state.processSubLoomPercentage > 0)
							return (
								<Progress percent={this.state.processSubLoomPercentage} indicating progress disabled size='large'>Processing...</Progress>
							)	
						if(this.state.downloadSubLoomPercentage > 0)
							return (
								<Progress percent={this.state.downloadSubLoomPercentage} indicating progress disabled size='large'>Downloading...</Progress>
							)
					}
				}

				metadata = (
					<Grid.Row columns="1" centered className='viewerRow'>
						<Grid.Column stretched className='viewerCell'>
							{md.description}<br />
							{image}
							{markerTable}
							{legendTable}
							{downloadSubLoomButton()}
							<br />
						</Grid.Column>
					</Grid.Row>
				);
			}

			return (
				<Tab.Pane attached={false} key={i} className={'feature'+ i + ' stretched marginBottom'} style={{textAlign: 'center'}}>
					<Grid>
						<Grid.Row columns="1" centered className='viewerRow'>
							<Grid.Column className='viewerCell'>
								{activeFeatures[i] ? activeFeatures[i].featureType : ''} <b> {activeFeatures[i] ? activeFeatures[i].feature : ''} </b>
							</Grid.Column>
						</Grid.Row>
						{metadata}
					</Grid>
				</Tab.Pane>
			)
		}

		let panes = [
			{ menuItem: 'Cell selections', render: lassoTab },
		]
		if (!hideFeatures) {
			_.times(3, i => {
					panes.push({
						menuItem: activeFeatures[i] && activeFeatures[i].feature ? ("F"+(i+1)+": " + activeFeatures[i].feature) : "F"+(i+1),
						render: () => featureTab(i),
					})
			})
		}
		
		let annotations = {}
		if (this.props.getSelectedAnnotations) {
			annotations = this.props.getSelectedAnnotations();
		}

		return (
			<div className="flexDisplay">
				<Tab
					menu={{ secondary: true, pointing: true }}
					panes={panes}
					renderActiveOnly={true}
					activeIndex={activeTab}
					className="sidebarTabs"
					onTabChange={(evt, data) => {
						this.setState({activeTab: data.activeIndex});
					}}
				/>
				<Metadata 
					selectionId={this.state.modalID} 
					onClose={() =>{
						ReactGA.event({
							category: 'metadata',
							action: 'modal closed',
							value: this.state.modalID,
						});
						this.setState({modalID: null});
						this.forceUpdate();
					}}
					annotations={Object.keys(annotations)}
				/>
			</div>
		);
	}

	componentWillMount() {
		BackendAPI.onViewerSelectionsChange(this.selectionsListener);
		BackendAPI.onActiveFeaturesChange(this.state.activePage, this.activeFeaturesListener);
	}

	componentWillUnmount() {
		BackendAPI.removeViewerSelectionsChange(this.selectionsListener);
		BackendAPI.removeActiveFeaturesChange(this.state.activePage, this.activeFeaturesListener);
	}

	toggleLassoSelection(id) {
		let selected = BackendAPI.toggleLassoSelection(id);
		ReactGA.event({
			category: 'viewer',
			action: 'selection toggled',
			label: selected ? 'on' : 'off',
			value: id
		});
	}

	removeLassoSelection(id) {
		BackendAPI.removeViewerSelection(id);
		ReactGA.event({
			category: 'viewer',
			action: 'selection removed',
			value: id
		});
	}
}
export default withRouter(ViewerSidebar);