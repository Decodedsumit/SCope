import _ from 'lodash'
import React, { Component } from 'react'
import { Header, Grid } from 'semantic-ui-react'
import FeatureSearchBox from '../common/FeatureSearchBox'
import { BackendAPI } from '../common/API'
import Viewer from '../common/Viewer'
import ViewerSidebar from '../common/ViewerSidebar'
import ViewerToolbar from '../common/ViewerToolbar'
import Histogram from '../common/Histogram'

export default class Regulon extends Component {
    constructor() {
        super();
        this.state = {
            activeLoom: BackendAPI.getActiveLoom(),
            activeFeatures: BackendAPI.getActiveFeatures('regulon'),
            thresholds: [0, 0, 0],
            colors: ["red", "green", "blue"]
        };
        console.log('features', this.state.activeFeatures);
        BackendAPI.onActiveLoomChange((loom) => {
            this.setState({activeLoom: loom});
        });
        BackendAPI.onActiveFeaturesChange((features) => {
            this.setState({activeFeatures: features});
        });
    }

    render() {
        const { activeLoom, activeFeatures, thresholds, colors } = this.state;
        let featureSearch = _.times(3, i => (
            <Grid.Column key={i}>
                <FeatureSearchBox field={i} color={colors[i]} type="regulon" locked="1" value={activeFeatures[i].value} />
            </Grid.Column>
        ));
        let featureThreshold = _.times(3, i => (
            <Grid.Column key={i}>
                <Histogram field={i} color={colors[i]} loomFile={activeLoom} feature={activeFeatures[i]} onThresholdChange={this.onThresholdChange.bind(this)} />
            </Grid.Column>
        ));

        return (
            <div>
                <div style={{display: activeLoom == null ? 'block' : 'none'}}>
                    Select the dataset to be analyzed
                </div>
                <div style={{display: activeLoom != null ? 'block' : 'none'}}>
                    <Grid>
                        <Grid.Row columns="4">
                            {featureSearch}
                        </Grid.Row>
                        <Grid.Row columns="4">
                            {featureThreshold}
                        </Grid.Row>
                        <Grid.Row columns="4">
                            <Grid.Column width={1}>
                                <ViewerToolbar />
                            </Grid.Column>
                            <Grid.Column width={6}>
                                <Viewer name="reg" width="700" height="600" loomFile={activeLoom} activeFeatures={activeFeatures} thresholds={thresholds} />
                            </Grid.Column>
                            <Grid.Column width={4}>
                                <Viewer name="auc" width="400" height="400" loomFile={activeLoom} activeFeatures={activeFeatures} thresholds={thresholds} />
                                <Viewer name="expr" width="400" height="400" loomFile={activeLoom} activeFeatures={activeFeatures} thresholds={thresholds} />
                            </Grid.Column>
                            <Grid.Column width={3}>
                                <ViewerSidebar />
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                </div>
            </div>
        );
    }

    onThresholdChange(idx, threshold) {
        let thresholds = this.state.thresholds;
        console.log('thresh', idx, threshold);
        thresholds[idx] = threshold;
        this.setState({thresholds: thresholds});
    }

}
