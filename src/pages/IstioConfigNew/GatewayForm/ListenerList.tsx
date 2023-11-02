import * as React from 'react';
import { cellWidth, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { kialiStyle } from 'styles/StyleUtils';
import { PFColors } from '../../../components/Pf/PfColors';
import { Button, ButtonVariant } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { Listener } from '../../../types/IstioObjects';
import { ListenerForm } from '../K8sGatewayForm';
import { ListenerBuilder, allowedRoutes, protocols } from './ListenerBuilder';

type Props = {
  onChange: (listener: Listener[], listenerForm: ListenerForm[]) => void;
  listenersForm: ListenerForm[];
  listeners: Listener[];
};

const noListenerStyle = kialiStyle({
  marginTop: 10,
  color: PFColors.Red100,
  textAlign: 'center',
  width: '100%'
});

const addListenerStyle = kialiStyle({
  marginLeft: 0,
  paddingLeft: 0
});

const headerCells = [
  {
    title: $t('Name'),
    transforms: [cellWidth(20) as any],
    props: {}
  },
  {
    title: $t('Hostname'),
    transforms: [cellWidth(20) as any],
    props: {}
  },
  {
    title: $t('Port'),
    transforms: [cellWidth(10) as any],
    props: {}
  },
  {
    title: $t('Protocol'),
    transforms: [cellWidth(10) as any],
    props: {}
  },
  {
    title: $t('FromNamespaces'),
    transforms: [cellWidth(10) as any],
    props: {}
  },
  {
    title: $t('Labels'),
    transforms: [cellWidth(25) as any],
    props: {}
  },
  {
    title: '',
    transforms: [cellWidth(10) as any],
    props: {}
  }
];

export const addSelectorLabels = (value: string) => {
  if (value.length === 0) {
    return;
  }
  value = value.trim();
  const labels: string[] = value.split(',');

  const selector: { [key: string]: string } = {};
  // Some smoke validation rules for the labels
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    if (label.indexOf('=') < 0) {
      break;
    }
    const splitLabel: string[] = label.split('=');
    if (splitLabel.length !== 2) {
      break;
    }
    if (splitLabel[0].trim().length === 0 || splitLabel[1].trim().length === 0) {
      break;
    }
    selector[splitLabel[0].trim()] = splitLabel[1].trim();
  }
  return selector;
};

type ListenerListState = {
  keyFocus: string;
};

export class ListenerList extends React.Component<Props, ListenerListState> {
  onAddListener = () => {
    const newListener: ListenerForm = {
      hostname: '',
      port: '',
      name: '',
      protocol: protocols[0],
      isHostValid: false,
      from: allowedRoutes[0],
      isLabelSelectorValid: false,
      sSelectorLabels: ''
    };
    const l = this.props.listenersForm;
    l.push(newListener);

    const newListenerF: Listener = {
      hostname: '',
      port: 70000,
      name: '',
      protocol: protocols[0],
      allowedRoutes: { namespaces: { from: allowedRoutes[0], selector: { matchLabels: {} } } }
    };

    const lf = this.props.listeners;
    lf.push(newListenerF);

    this.setState({}, () => this.props.onChange(lf, l));
  };

  onRemoveListener = (index: number) => {
    const l = this.props.listenersForm;
    l.splice(index, 1);

    const lf = this.props.listeners;
    lf.splice(index, 1);

    this.setState({}, () => this.props.onChange(lf, l));
  };

  onChange = (listenersForm: ListenerForm, i: number) => {
    const lf = this.props.listenersForm;
    lf[i] = listenersForm;

    const l = this.props.listeners;
    const newL = this.createNewListener(listenersForm);
    if (typeof newL !== 'undefined') {
      l[i] = newL;
    }

    this.props.onChange(l, lf);
  };

  createNewListener = (listenerForm: ListenerForm) => {
    if (listenerForm.port.length === 0 || isNaN(Number(listenerForm.port))) return;
    if (listenerForm.hostname.length === 0) return;

    const selector = addSelectorLabels(listenerForm.sSelectorLabels) || {};

    const listener: Listener = {
      hostname: listenerForm.hostname,
      port: Number(listenerForm.port),
      name: listenerForm.name,
      protocol: listenerForm.protocol,
      allowedRoutes: { namespaces: { from: listenerForm.from, selector: { matchLabels: selector } } }
    };
    return listener;
  };

  render() {
    return (
      <>
        <Table aria-label="Listener List">
          <Thead>
            <Tr>
              {headerCells.map(e => (
                <Th>{e.title}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {this.props.listenersForm.map((listener, i) => (
              <ListenerBuilder
                listener={listener}
                onRemoveListener={this.onRemoveListener}
                index={i}
                onChange={this.onChange}
              ></ListenerBuilder>
            ))}
            <Tr>
              <Td>
                <Button
                  name="addListener"
                  variant={ButtonVariant.link}
                  icon={<PlusCircleIcon />}
                  onClick={this.onAddListener}
                  className={addListenerStyle}
                >
                  {$t('action8')}
                </Button>
              </Td>
            </Tr>
          </Tbody>
        </Table>
        {this.props.listenersForm.length === 0 && <div className={noListenerStyle}>{$t('NoListenersDefined')}</div>}
      </>
    );
  }
}
