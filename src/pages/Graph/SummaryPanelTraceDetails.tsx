import * as React from 'react';
import { Link } from 'react-router-dom';
import { connect } from 'react-redux';
import { kialiStyle } from 'styles/StyleUtils';
import { Tooltip, Button, ButtonVariant, Icon, pluralize } from '@patternfly/react-core';
import { SelectList, SelectOption } from '@patternfly/react-core';
import {
  InfoAltIcon,
  CloseIcon,
  ExternalLinkAltIcon,
  ExclamationCircleIcon,
  MapMarkerIcon
} from '@patternfly/react-icons';
import { URLParam } from '../../app/History';
import { JaegerTrace, RichSpanData, EnvoySpanInfo, OpenTracingHTTPInfo, OpenTracingTCPInfo } from 'types/TracingInfo';
import { KialiAppState } from 'store/Store';
import { TracingThunkActions } from 'actions/TracingThunkActions';
import { GraphActions } from 'actions/GraphActions';
import { PFColors } from 'components/Pf/PfColors';
import { findChildren, findParent, formatDuration } from 'utils/tracing/TracingHelper';
import { decoratedNodeData } from 'components/CytoscapeGraph/CytoscapeGraphUtils';
import { FocusAnimation } from 'components/CytoscapeGraph/FocusAnimation';
import { FormattedTraceInfo, shortIDStyle } from 'components/TracingIntegration/TracingResults/FormattedTraceInfo';
import { SimplerSelect } from 'components/SimplerSelect';
import { summaryFont, summaryTitle } from './SummaryPanelCommon';
import { NodeParamsType, GraphType, SummaryData, NodeAttr } from 'types/Graph';
import { KialiDispatch } from 'types/Redux';
import { bindActionCreators } from 'redux';
import { responseFlags } from 'utils/ResponseFlags';
import { isParentKiosk, kioskContextMenuAction } from '../../components/Kiosk/KioskActions';
import { Visualization, Node } from '@patternfly/react-topology';
import { elems, selectAnd } from 'pages/GraphPF/GraphPFElems';
import { FocusNode } from 'pages/GraphPF/GraphPF';
import { GraphSelectorBuilder } from './GraphSelector';
import { GetTraceDetailURL } from '../../components/TracingIntegration/TracesComponent';
import { ExternalServiceInfo } from '../../types/StatusState';

type ReduxProps = {
  close: () => void;
  externalServices: ExternalServiceInfo[];
  kiosk: string;
  provider: string | undefined;
  setNode: (node?: NodeParamsType) => void;
};

type Props = ReduxProps & {
  data: SummaryData;
  graphType: GraphType;
  tracingURL?: string;
  onFocus?: (focusNode: FocusNode) => void;
  trace: JaegerTrace;
};

type State = {
  selectedSpanID: string | undefined;
};

const closeBoxStyle = kialiStyle({
  float: 'right',
  marginTop: '-7px'
});

const nameStyle = kialiStyle({
  display: 'inline-block',
  maxWidth: '95%',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap'
});

const pStyle = kialiStyle({
  paddingTop: '10px',
  $nest: {
    '& button': {
      fontSize: 'var(--graph-side-panel--font-size)',
      paddingTop: '5px',
      paddingBottom: '5px'
    }
  }
});

const spanSelectStyle = kialiStyle({
  maxWidth: '100%'
});

class SummaryPanelTraceDetailsComponent extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { selectedSpanID: undefined };
  }

  componentDidUpdate(props: Props) {
    if (props.trace.traceID !== this.props.trace.traceID) {
      this.setState({ selectedSpanID: undefined });
    }
  }

  render() {
    const isPF = this.props.data.isPF;
    let node: any = {};
    let nodeData: any = {};
    if (this.props.data.summaryType === 'node') {
      node = this.props.data.summaryTarget;
      nodeData = isPF ? node.getData() : decoratedNodeData(node);
    }
    const tracesDetailsURL = nodeData.namespace
      ? `/namespaces/${nodeData.namespace}` +
        (nodeData.workload
          ? `/workloads/${nodeData.workload}`
          : nodeData.service
          ? `/services/${nodeData.service}`
          : `/applications/${nodeData.app!}`) +
        `?tab=traces&${URLParam.TRACING_TRACE_ID}=${this.props.trace.traceID}`
      : undefined;
    const jaegerTraceURL = GetTraceDetailURL(
      this.props.provider,
      this.props.tracingURL,
      this.props.externalServices
    )?.replace('TRACEID', this.props.trace.traceID);
    const info = new FormattedTraceInfo(this.props.trace);
    const title = (
      <span className={nameStyle}>
        {info.name()}
        <span className={shortIDStyle}>{info.shortID()}</span>
      </span>
    );
    const spans: RichSpanData[] = (isPF ? nodeData['hasSpans'] : nodeData['spans']) || [];
    let currentSpan = spans.find(s => s.spanID === this.state.selectedSpanID);
    if (!currentSpan && spans.length > 0) {
      currentSpan = spans[0];
    }
    return (
      <>
        <div className={summaryTitle}>
          <span>Trace</span>
          <span className={closeBoxStyle}>
            <Tooltip content={$t('tip285')}>
              <Button id="close-trace" variant={ButtonVariant.plain} onClick={this.props.close}>
                <CloseIcon />
              </Button>
            </Tooltip>
          </span>
        </div>
        <div>
          {tracesDetailsURL ? (
            <Tooltip content={`${$t('tip286')}: ${info.name()}`}>
              <Link
                to={tracesDetailsURL}
                onClick={() => {
                  if (isParentKiosk(this.props.kiosk)) {
                    kioskContextMenuAction(tracesDetailsURL);
                  }
                }}
              >
                {title}
              </Link>
            </Tooltip>
          ) : (
            <Tooltip content={`${info.name()}`}>{title}</Tooltip>
          )}
          <div>
            {info.numErrors !== 0 && (
              <>
                <ExclamationCircleIcon color={PFColors.Danger} />{' '}
                <strong>This trace has {pluralize(info.numErrors, 'error')}.</strong>
              </>
            )}
            <div>
              <strong>{$t('Started')}: </strong>
              {info.fromNow()}
            </div>
            {info.duration() && (
              <div>
                <strong>{$t('Full_duration')}: </strong>
                {info.duration()}
              </div>
            )}
          </div>
          {spans.length > 0 && (
            <div className={pStyle}>
              <div>
                <strong>{pluralize(spans.length, 'span')}</strong> {$t('on_this_node')}
                <SimplerSelect
                  selected={currentSpan?.operationName}
                  className={spanSelectStyle}
                  onSelect={key => {
                    this.setState({ selectedSpanID: key as string });
                  }}
                >
                  <SelectList>
                    {spans.map(s => {
                      return (
                        <SelectOption key={s.spanID} value={s.spanID}>
                          <>
                            <div>{s.operationName}</div>
                            <div>(t + {formatDuration(s.relativeStartTime)})</div>
                          </>
                        </SelectOption>
                      );
                    })}
                  </SelectList>
                </SimplerSelect>
              </div>
            </div>
          )}
          {currentSpan && <div className={pStyle}>{this.renderSpan(currentSpan)}</div>}
          {jaegerTraceURL && (
            <>
              <br />
              <a href={jaegerTraceURL} target="_blank" rel="noopener noreferrer">
                {$t('Show_in_Tracing')}{' '}
                <Icon size="sm">
                  <ExternalLinkAltIcon />
                </Icon>
              </a>
            </>
          )}
        </div>
      </>
    );
  }

  private spanViewLink(span: RichSpanData): string | undefined {
    const node = this.props.data.summaryTarget;
    const nodeData = this.props.data.isPF ? node.getData() : decoratedNodeData(node);
    return nodeData.namespace
      ? `/namespaces/${nodeData.namespace}` +
          (nodeData.workload
            ? `/workloads/${nodeData.workload}`
            : nodeData.service
            ? `/services/${nodeData.service}`
            : `/applications/${nodeData.app!}`) +
          `?tab=traces&${URLParam.TRACING_TRACE_ID}=${this.props.trace.traceID}&${URLParam.TRACING_SPAN_ID}=${span.spanID}`
      : undefined;
  }

  private renderSpan(span: RichSpanData) {
    const spanURL = this.spanViewLink(span);
    return (
      <>
        <div>
          <strong>{$t('Started after')}: </strong>
          {formatDuration(span.relativeStartTime)}
        </div>
        <div>
          <strong>{$t('Duration')}: </strong>
          {formatDuration(span.duration)}
        </div>
        {(span.type === 'http' || span.type === 'envoy') && this.renderHTTPSpan(span)}
        {span.type === 'tcp' && this.renderTCPSpan(span)}
        <div>
          <strong>{$t('Related')}: </strong>
          {this.renderRelatedSpans(span)}
        </div>
        {spanURL && (
          <div>
            <Link
              to={spanURL}
              onClick={() => {
                if (isParentKiosk(this.props.kiosk)) {
                  kioskContextMenuAction(spanURL);
                }
              }}
            >
              {$t('Show_span')}
            </Link>
          </div>
        )}
      </>
    );
  }

  private renderRelatedSpans(span: RichSpanData) {
    type Related = { text: string; span: RichSpanData };
    const parent = findParent(span) as RichSpanData;
    const children = findChildren(span, this.props.trace) as RichSpanData[];
    const related = ((parent ? [{ text: 'parent', span: parent }] : []) as Related[]).concat(
      children.map((child, idx) => ({ text: 'child ' + (idx + 1), span: child }))
    );
    return (
      <>
        {related.length > 0
          ? related.map(r => this.linkToSpan(span, r.span, r.text)).reduce((prev, curr) => [prev, ', ', curr] as any)
          : 'none'}
      </>
    );
  }

  private linkToSpan(current: RichSpanData, target: RichSpanData, text: string): React.ReactFragment {
    if (this.props.data.isPF) {
      return this.linkToSpanPF(current, target, text);
    }

    const useApp = this.props.graphType === GraphType.APP || this.props.graphType === GraphType.SERVICE;
    const currentElt = useApp ? current.app : current.workload;
    const targetElt = useApp ? target.app : target.workload;
    let tooltipContent = <>{text}</>;
    if (targetElt) {
      const cy = this.props.data.summaryTarget.cy();
      const selBuilder = new GraphSelectorBuilder().namespace(target.namespace).class('span');
      const selector = useApp ? selBuilder.app(targetElt).build() : selBuilder.workload(targetElt).build();
      tooltipContent = (
        <>
          <Button
            variant={ButtonVariant.link}
            onClick={() => {
              this.setState({ selectedSpanID: target.spanID });
              if (targetElt !== currentElt || target.namespace !== current.namespace) {
                cy.elements(selector).trigger('tap');
              }
            }}
            isInline
          >
            <span style={summaryFont}>{text}</span>
          </Button>{' '}
          <Button
            variant={ButtonVariant.link}
            onClick={() => new FocusAnimation(cy).start(cy.elements(selector))}
            isInline
          >
            <span style={summaryFont}>
              <MapMarkerIcon />
            </span>
          </Button>
        </>
      );
    }
    return (
      <Tooltip
        key={target.spanID}
        content={
          <>
            {$t('OperationName')}: {target.operationName}
            <br />
            {$t('Workload')}: {target.workload || $t('unknown')}
          </>
        }
      >
        {tooltipContent}
      </Tooltip>
    );
  }

  private linkToSpanPF(current: RichSpanData, target: RichSpanData, text: string): React.ReactFragment {
    const useApp = this.props.graphType === GraphType.APP || this.props.graphType === GraphType.SERVICE;
    const currentElt = useApp ? current.app : current.workload;
    const targetElt = useApp ? target.app : target.workload;
    let tooltipContent = <>{text}</>;
    if (targetElt) {
      // PF Graph
      const controller =
        this.props.data.summaryType === 'graph'
          ? (this.props.data.summaryTarget as Visualization)
          : (this.props.data.summaryTarget as Node).getController();
      if (!controller) {
        return <></>;
      }
      const { nodes } = elems(controller);
      const node = selectAnd(nodes, [
        { prop: NodeAttr.namespace, val: target.namespace },
        { prop: 'hasSpans', op: 'truthy' },
        { prop: useApp ? NodeAttr.app : NodeAttr.workload, val: targetElt }
      ]);

      tooltipContent = (
        <>
          <Button
            variant={ButtonVariant.link}
            onClick={() => {
              this.setState({ selectedSpanID: target.spanID });
              if (targetElt !== currentElt || target.namespace !== current.namespace) {
                this.props.onFocus!({ id: node[0].getId(), isSelected: true });
              }
            }}
            isInline
          >
            <span style={summaryFont}>{text}</span>
          </Button>{' '}
          <Button variant={ButtonVariant.link} onClick={() => this.props.onFocus!({ id: node[0].getId() })} isInline>
            <span style={summaryFont}>
              <MapMarkerIcon />
            </span>
          </Button>
        </>
      );
    }
    return (
      <Tooltip
        key={target.spanID}
        content={
          <>
            {$t('OperationName')}: {target.operationName}
            <br />
            {$t('Workload')}: {target.workload || $t('unknown')}
          </>
        }
      >
        {tooltipContent}
      </Tooltip>
    );
  }

  private renderHTTPSpan(span: RichSpanData) {
    const info = span.info as OpenTracingHTTPInfo | EnvoySpanInfo;
    const rqLabel =
      info.direction === 'inbound' ? 'Inbound request' : info.direction === 'outbound' ? 'Outbound request' : 'Request';
    const flag = (info as EnvoySpanInfo).responseFlags;
    return (
      <>
        <div>
          <strong>{rqLabel}: </strong>
          {info.method} {info.url}
        </div>
        <div>
          <strong>{$t('Response')}: </strong>
          {$t('code')} {info.statusCode || $t('unknown')}
          {flag && ', flags ' + flag}
        </div>
        {flag && (
          <div>
            <InfoAltIcon /> {$t(responseFlags[flag]?.help) || $t('UnknownFlag')}
          </div>
        )}
      </>
    );
  }

  private renderTCPSpan(span: RichSpanData) {
    const info = span.info as OpenTracingTCPInfo;
    return (
      <>
        {info.topic && (
          <div>
            <strong>{$t('Topic')}: </strong>
            {info.topic}
          </div>
        )}
      </>
    );
  }
}

const mapStateToProps = (state: KialiAppState) => ({
  externalServices: state.statusState.externalServices,
  kiosk: state.globalState.kiosk,
  provider: state.tracingState.info?.provider
});

const mapDispatchToProps = (dispatch: KialiDispatch) => ({
  close: () => dispatch(TracingThunkActions.setTraceId('', undefined)),
  setNode: bindActionCreators(GraphActions.setNode, dispatch)
});

export const SummaryPanelTraceDetails = connect(mapStateToProps, mapDispatchToProps)(SummaryPanelTraceDetailsComponent);
