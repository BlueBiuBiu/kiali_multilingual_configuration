import * as React from 'react';
import { cellWidth, ICell } from '@patternfly/react-table';
import { Table, TableBody, TableHeader } from '@patternfly/react-table/deprecated';
import { kialiStyle } from 'styles/StyleUtils';
import { PFColors } from '../../components/Pf/PfColors';
// Use TextInputBase like workaround while PF4 team work in https://github.com/patternfly/patternfly-react/issues/4072
import {
  Button,
  ButtonVariant,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Switch,
  TextInputBase as TextInput
} from '@patternfly/react-core';
import { isSidecarHostValid } from '../../utils/IstioConfigUtils';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { isValid } from 'utils/Common';

const headerCells: ICell[] = [
  {
    title: $t('EgressHost'),
    transforms: [cellWidth(60) as any],
    props: {}
  },
  {
    title: '',
    props: {}
  }
];

const noEgressHostsStyle = kialiStyle({
  marginTop: 15,
  color: PFColors.Red100
});


export type EgressHost = {
  host: string;
};

type Props = {
  sidecar: SidecarState;
  onChange: (sidecar: SidecarState) => void;
};

export const SIDECAR = 'Sidecar';
export const SIDECARS = 'sidecars';

// Gateway and Sidecar states are consolidated in the parent page
export type SidecarState = {
  addEgressHost: EgressHost;
  addWorkloadSelector: boolean;
  egressHosts: EgressHost[];
  validEgressHost: boolean;
  workloadSelectorValid: boolean;
  workloadSelectorLabels: string;
};

export const isSidecarStateValid = (s: SidecarState): boolean => {
  return s.egressHosts.length > 0 && (!s.addWorkloadSelector || (s.addWorkloadSelector && s.workloadSelectorValid));
};

export const initSidecar = (initHost: string): SidecarState => {
  return {
    addEgressHost: {
      host: ''
    },
    addWorkloadSelector: false,
    egressHosts: [
      {
        host: initHost
      }
    ],
    validEgressHost: false,
    workloadSelectorValid: false,
    workloadSelectorLabels: ''
  };
};

export class SidecarForm extends React.Component<Props, SidecarState> {
  constructor(props: Props) {
    super(props);
    this.state = initSidecar('');
  }

  componentDidMount() {
    this.setState(this.props.sidecar);
  }

  // @ts-ignore
  actionResolver = (rowData, { rowIndex }) => {
    const removeAction = {
      title: $t('RemoveServer'),
      // @ts-ignore
      onClick: (event, rowIndex, _rowData, _extraData) => {
        this.setState(
          prevState => {
            prevState.egressHosts.splice(rowIndex, 1);
            return {
              egressHosts: prevState.egressHosts
            };
          },
          () => this.props.onChange(this.state)
        );
      }
    };
    if (rowIndex < this.state.egressHosts.length) {
      return [removeAction];
    }
    return [];
  };

  onAddHost = (_event, value: string) => {
    const host = value.trim();
    this.setState({
      addEgressHost: {
        host: host
      },
      validEgressHost: isSidecarHostValid(host)
    });
  };

  onAddEgressHost = () => {
    this.setState(
      prevState => {
        prevState.egressHosts.push(this.state.addEgressHost);
        return {
          egressHosts: prevState.egressHosts,
          addEgressHost: {
            host: ''
          }
        };
      },
      () => this.props.onChange(this.state)
    );
  };

  addWorkloadLabels = (_event, value: string) => {
    if (value.length === 0) {
      this.setState(
        {
          workloadSelectorValid: false,
          workloadSelectorLabels: ''
        },
        () => this.props.onChange(this.state)
      );
      return;
    }
    value = value.trim();
    const labels: string[] = value.split(',');
    let isValid = true;
    // Some smoke validation rules for the labels
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      if (label.indexOf('=') < 0) {
        isValid = false;
        break;
      }
      const splitLabel: string[] = label.split('=');
      if (splitLabel.length !== 2) {
        isValid = false;
        break;
      }
      if (splitLabel[0].trim().length === 0 || splitLabel[1].trim().length === 0) {
        isValid = false;
        break;
      }
    }
    this.setState(
      {
        workloadSelectorValid: isValid,
        workloadSelectorLabels: value
      },
      () => this.props.onChange(this.state)
    );
  };

  rows() {
    return this.state.egressHosts
      .map((eHost, i) => ({
        key: 'eH' + i,
        cells: [<>{eHost.host}</>, '']
      }))
      .concat([
        {
          key: 'eHNew',
          cells: [
            <>
              <TextInput
                value={this.state.addEgressHost.host}
                type="text"
                id="addEgressHost"
                key="addEgressHost"
                aria-describedby="add egress host"
                name="addHost"
                onChange={this.onAddHost}
                validated={isValid(this.state.validEgressHost)}
              />
              {!this.state.validEgressHost && (
                <div key="hostsHelperText" className={noEgressHostsStyle}>
                  {$t('helpTip50')}
                </div>
              )}
            </>,
            <>
              <Button
                variant={ButtonVariant.link}
                icon={<PlusCircleIcon />}
                isDisabled={!this.state.validEgressHost}
                onClick={this.onAddEgressHost}
              />
            </>
          ]
        }
      ]);
  }

  render() {
    return (
      <>
        <FormGroup label={$t('WorkloadSelector')} fieldId="workloadSelectorSwitch">
          <Switch
            id="workloadSelectorSwitch"
            label={' '}
            labelOff={' '}
            isChecked={this.state.addWorkloadSelector}
            onChange={() => {
              this.setState(
                prevState => ({
                  addWorkloadSelector: !prevState.addWorkloadSelector
                }),
                () => this.props.onChange(this.state)
              );
            }}
          />
        </FormGroup>
        {this.state.addWorkloadSelector && (
          <FormGroup fieldId="workloadLabels" label={$t('Labels')}>
            <TextInput
              id="gwHosts"
              name="gwHosts"
              isDisabled={!this.state.addWorkloadSelector}
              value={this.state.workloadSelectorLabels}
              onChange={this.addWorkloadLabels}
              validated={isValid(this.state.workloadSelectorValid)}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  {isValid(this.state.workloadSelectorValid) ? $t('helpTip51') : $t('helpTip46')}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        )}
        <FormGroup label={$t('Egress')} fieldId="egressHostTable">
          <Table
            aria-label="Egress Hosts"
            cells={headerCells}
            rows={this.rows()}
            // @ts-ignore
            actionResolver={this.actionResolver}
          >
            <TableHeader />
            <TableBody />
          </Table>
          {this.state.egressHosts.length === 0 && <div className={noEgressHostsStyle}>{$t('tip305')}</div>}
        </FormGroup>
      </>
    );
  }
}
