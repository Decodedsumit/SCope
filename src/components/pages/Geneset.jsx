import _ from 'lodash'
import React, { Component } from 'react'
import { withRouter, Link } from 'react-router-dom';
import { Button, Grid, Menu, Icon, Dimmer, Loader, Input, TextArea } from 'semantic-ui-react'
import FeatureSearchBox from '../common/FeatureSearchBox'
import { BackendAPI } from '../common/API'
import Viewer from '../common/Viewer'
import ViewerSidebar from '../common/ViewerSidebar'
import ViewerToolbar from '../common/ViewerToolbar'
import Histogram from '../common/Histogram'
import UploadModal from '../common/UploadModal';
import Uploader from '../common/Uploader';
import ReactGA from 'react-ga';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';

const { MyGeneSetsRequest
      , DeleteUserFileTimeRequest
      , GeneSetEnrichmentRequest } = require('../../../bin/s_pb.js');

class Geneset extends Component {

    constructor() {
        super();
        this.state = {
            activeLoom: BackendAPI.getActiveLoom(),
            activeCoordinates: BackendAPI.getActiveCoordinates(),
            activeFeatures: BackendAPI.getActiveFeatures(),
            genesetName: '',
            geneset: [],
            regulonMetadata: [],
            genesets: [],
            loading: true,
            loadingMessage: 'Loading genesets',
            selectedGeneset: null,
            uploadModalOpened: false,
            sidebar: BackendAPI.getSidebarVisible(),
            colors: [],
        };
        this.activeLoomListener = (loom, metadata, coordinates) => {
            this.setState({activeLoom: loom, activeCoordinates: coordinates});
        };
        this.activeFeaturesListener = (features, featureID) => {
            this.setState({activeFeatures: features});
        };
        this.sidebarVisibleListener = (state) => {
            this.setState({sidebar: state});
            this.forceUpdate();
        }
    }

    render() {
        const { match } = this.props;
        const { activeLoom, activeCoordinates, activeFeatures, colors, geneFeatures, sidebar, genesets, loading, uploadModalOpened, selectedGeneset, loadingMessage } = this.state;

        if (!activeLoom) return (
            <div>
                Select the dataset to be analyzed
            </div>
        )

        return (
            <Grid className="flexDisplay" >
                <Dimmer active={loading} inverted>
                    <Loader inverted>{loadingMessage}</Loader>
                </Dimmer>
                <Grid.Row columns="3" centered>
                    <Grid.Column width="11" stretched>
                        <Menu secondary>
                        <Menu.Menu>
                            <Menu.Item key="upload" onClick={this.showUploadModal.bind(this)}>
                                <Icon name="upload" />
                                <em>Upload a geneset file</em>
                            </Menu.Item>
                            {genesets.map((set, i) => {
                                let active = selectedGeneset == set.geneSetFilePath ? true : false;
                                console.log(selectedGeneset, set.geneSetFilePath, active);
                                return (
                                        <Menu.Item active={active} key={set.geneSetFilePath} onClick={() => {
                                            this.setState({selectedGeneset: set.geneSetFilePath});
                                        }} >
                                            <Icon name={active ? "selected radio" : "radio"} className="pointer" title="select this file" />
                                            {set.geneSetDisplayName} &nbsp;
                                            <Icon name='trash' title='delete this file' style={{display: 'inline'}} onClick={(e,d) => this.deleteGeneSets(set.geneSetFilePath, set.geneSetDisplayName)} className="pointer"  /> 
                                        </Menu.Item>
                                );
                            })}
                        </Menu.Menu>
                        </Menu>
                    </Grid.Column>
                    <Grid.Column width="2" textAlign='right'>
                        <Button color="orange" onClick={this.runGeneEnrichment.bind(this)} disabled={!selectedGeneset} >Run gene enrichment</Button>
                    </Grid.Column>
                    <Grid.Column width="3">&nbsp;</Grid.Column>
                </Grid.Row>
                <Grid.Row columns="5" centered>
                    <Grid.Column width="2">
                        <Menu secondary>
                            <Menu.Menu>
                                <Menu.Item key="create">
                                    <Icon name="add" />
                                    <em>or paste a list of genes</em>
                                </Menu.Item>
                            </Menu.Menu>
                        </Menu>
                    </Grid.Column>
                    <Grid.Column width="2" textAlign="right">
                        <Input placeholder="Geneset name" size="mini" value={this.state.genesetName}
                            onChange={(evt, data) => {
                                this.setState({genesetName: data.value});
                            }}/>
                    </Grid.Column>
                    <Grid.Column width="7">
                        {/*
                        <FeatureSearchBox type='gene' size="huge" onResultSelect={(result) => {
                            let geneset = this.state.geneset;
                            geneset.push(result.title);
                            this.setState({geneset});
                        }} />
                        */}
                        <TextArea placeholder="Gene1&#10;Gene2&#10;Gene3&#10;..." rows={4} onChange={(evt, data) => {
                            this.setState({geneset: data.value});
                        }} value={this.state.geneset} style={{width: '100%'}} />
                    </Grid.Column>
                    <Grid.Column width="2" textAlign="right">
                        <Button color="" onClick={this.saveGeneset.bind(this)} disabled={this.state.genesetName.length==0||this.state.geneset.length==0} >Save as geneset</Button>
                    </Grid.Column>
                    <Grid.Column width="3">&nbsp;</Grid.Column>
                </Grid.Row>
                {/*<Grid.Row colums="3">
                    <Grid.Column width="4">&nbsp;</Grid.Column>
                    <Grid.Column width="7">
                        <span key={this.state.genesetName}><b>{this.state.genesetName}</b> </span>
                        <ReactCSSTransitionGroup transitionName="highlight" transitionEnterTimeout={500} transitionLeave={false}>
                            {this.state.geneset.map((gene) => {
                                console.log(gene);
                                return (
                                    <span key={gene}>{gene}, </span>
                                )
                            })}
                        </ReactCSSTransitionGroup>
                    </Grid.Column>
                    <Grid.Column width="5">&nbsp;</Grid.Column>
                </Grid.Row>*/}
                <Grid.Row columns="4" stretched className="viewerFlex flexRow">
                    <Grid.Column width={1}>
                        <ViewerToolbar />
                    </Grid.Column>
                    <Grid.Column stretched className="flexDouble">
                        <b className="noStretch">Geneset AUC values</b>
                        <Viewer 
                            customColors={true}
                            name="reg" 
                            loomFile={activeLoom} 
                            activeFeatures={activeFeatures} 
                            activeCoordinates={activeCoordinates}
                            scale={true} 
                            colors={colors}
                        />
                    </Grid.Column>
                    <Grid.Column width={3}>
                        <ViewerSidebar hideFeatures={true} onActiveFeaturesChange={(features, id) => {
                            this.setState({activeFeatures: features});
                        }} />
                    </Grid.Column>
                </Grid.Row>
                <UploadModal title="Import a geneset file" type='GeneSet' uuid={match.params.uuid} opened={uploadModalOpened} onClose={this.hideUploadModal.bind(this)} onUploaded={this.onGenesetUploaded.bind(this)} />
            </Grid>
        );
    }

    componentWillMount() {
        BackendAPI.onActiveLoomChange(this.activeLoomListener);
        BackendAPI.onActiveFeaturesChange('regulon', this.activeFeaturesListener);
        BackendAPI.onSidebarVisibleChange(this.sidebarVisibleListener);
    }

    componentWillUnmount() {
        BackendAPI.removeActiveLoomChange(this.activeLoomListener);
        BackendAPI.removeActiveFeaturesChange('regulon', this.activeFeaturesListener);
        BackendAPI.removeSidebarVisibleChange(this.sidebarVisibleListener)
    }

    componentDidMount() {
        this.getGeneSets();
    }

    showUploadModal(event) {
        this.setState({ uploadModalOpened: true })
        ReactGA.event({
            category: 'upload',
            action: 'toggle geneset upload modal'
        });
    }

    hideUploadModal(event) {
        this.setState({ uploadModalOpened: false })
        ReactGA.event({
            category: 'upload',
            action: 'toggle geneset upload modal'
        });
    }

    saveGeneset() {
        const { match } = this.props;
        let uploader = new Uploader();
        let fileContent = this.state.genesetName + "\n" + this.state.geneset;
        uploader.upload(match.params.uuid, 'GeneSet', new File([fileContent], this.state.genesetName, {type: "text/plain"}), () => {
        }, this.onGenesetUploaded.bind(this));
    }

    getGeneSets() {
        const { match } = this.props;

        const req = new MyGeneSetsRequest();
        req.setUuid(match.params.uuid)

        if (DEBUG) console.log('getMyGeneSets', req);
        BackendAPI.getConnection().getMyGeneSets(req, {}, (err, response) => {
            if(err != null) {
                BackendAPI.showError();	
            }
            if (DEBUG) console.log('getMyGeneSets', response);
            if (response !== null) {
                if (DEBUG) console.log("getMyGeneSets", response);
                this.setState({ genesets: response.getMyGeneSetsList(), loading: false });
            } else {
                this.setState({ loading: false });
                console.log("No geneset files detected");
            }
        })
    }

    deleteGeneSets(geneSetFilePath, geneSetDisplayName) {
		const { match } = this.props;
		ReactGA.event({
			category: 'geneset',
			action: 'removed geneset file',
		});
		let execute = confirm("Are you sure that you want to remove the file: " + geneSetDisplayName + " ?");
		if (execute) {
            
            const req = new DeleteUserFileTimeRequest();
            req.setUuid(match.params.uuid);
            req.setFilePath(geneSetFilePath)
            req.setFileType('GeneSet')
            if (DEBUG) console.log('deleteUserFile', req);
            BackendAPI.getConnection().deleteUserFile(req, {}, (err, response) => {
                if(err != null) {
                    BackendAPI.showError();	
                }
                if (DEBUG) console.log('deleteUserFile', response);
                if (response !== null) {
                    this.getGeneSets();
                }
            })
		}
	}
    
    runGeneEnrichment() {

        const req = new GeneSetEnrichmentRequest();
        req.setLoomFilePath(BackendAPI.getActiveLoom());
        req.setGeneSetFilePath(this.state.selectedGeneset)
        req.setMethod("AUCell")

        if (DEBUG) console.log('doGeneSetEnrichment', req);
        BackendAPI.getConnection().doGeneSetEnrichment(req)
        call.on('data', (gse) => {
            if (DEBUG) console.log('doGeneSetEnrichment data', gse);
            if (gse.getIsDone()) {
                this.setState({loading: false, colors: gse.getCellValuesList().getColorList()});
            } else {
                this.setState({loadingMessage: gse.getProgress().getStatus()});
            }
        });
        call.on('end', () => {
            if (DEBUG) console.log('doGeneSetEnrichment end');
            ReactGA.event({
                category: 'geneset',
                action: 'enrichment finished',
                nonInteraction: true
            });
        });
        call.on('error', function(err) {
            console.log('doGeneSetEnrichment error: ' + err.message);
            BackendAPI.showError();
        });

        ReactGA.event({
            category: 'geneset',
            action: 'enrichment started'
        });
    }

    onGenesetUploaded() {
        this.getGeneSets();
        this.hideUploadModal();
        this.setState({
            geneset: '',
            genesetName: '',
        })
        ReactGA.event({
            category: 'upload',
            action: 'uploaded geneset file',
            nonInteraction: true
        });
    }

}
export default withRouter(Geneset);