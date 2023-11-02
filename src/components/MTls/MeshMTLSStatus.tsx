import * as React from 'react';

import { KialiAppState } from '../../store/Store';
import { MTLSIconTypes } from './MTLSIcon';
import { MTLSStatus, emptyDescriptor, StatusDescriptor } from './MTLSStatus';
import { kialiStyle } from 'styles/StyleUtils';
import { meshWideMTLSEnabledSelector, meshWideMTLSStatusSelector, namespaceItemsSelector } from '../../store/Selectors';
import { connect } from 'react-redux';
import { MTLSStatuses, TLSStatus } from '../../types/TLSStatus';
import * as AlertUtils from '../../utils/AlertUtils';
import { MessageType } from '../../types/MessageCenter';
import * as API from '../../services/Api';
import { KialiDispatch } from '../../types/Redux';
import { bindActionCreators } from 'redux';
import { MeshTlsActions } from '../../actions/MeshTlsActions';
import { TimeInMilliseconds } from '../../types/Common';
import { Namespace } from '../../types/Namespace';
import { connectRefresh } from '../Refresh/connectRefresh';

type ReduxProps = {
  setMeshTlsStatus: (meshStatus: TLSStatus) => void;
  namespaces: Namespace[] | undefined;
  status: string;
  autoMTLSEnabled: boolean;
};

type Props = ReduxProps & {
  lastRefreshAt: TimeInMilliseconds;
};

const statusDescriptors = new Map<string, StatusDescriptor>([
  [
    MTLSStatuses.ENABLED,
    {
      message: $t('tip234'),
      icon: MTLSIconTypes.LOCK_FULL,
      showStatus: true
    }
  ],
  [
    MTLSStatuses.PARTIALLY,
    {
      message: $t('tip235'),
      icon: MTLSIconTypes.LOCK_HOLLOW,
      showStatus: true
    }
  ],
  [
    MTLSStatuses.ENABLED_DEFAULT,
    {
      message: $t('tip236'),
      icon: MTLSIconTypes.LOCK_FULL,
      showStatus: true
    }
  ],
  [
    MTLSStatuses.PARTIALLY_DEFAULT,
    {
      message: $t('tip237'),
      icon: MTLSIconTypes.LOCK_HOLLOW,
      showStatus: true
    }
  ],
  [
    MTLSStatuses.AUTO_DEFAULT,
    {
      message: $t('tip238'),
      icon: MTLSIconTypes.LOCK_FULL,
      showStatus: true
    }
  ],
  [MTLSStatuses.NOT_ENABLED, emptyDescriptor]
]);

class MeshMTLSStatusComponent extends React.Component<Props> {
  componentDidMount() {
    this.fetchStatus();
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.lastRefreshAt !== prevProps.lastRefreshAt) {
      this.fetchStatus();
    }
  }

  fetchStatus = () => {
    // leaving empty cluster param here, home cluster will be used by default
    API.getMeshTls()
      .then(response => {
        return this.props.setMeshTlsStatus(response.data);
      })
      .catch(error => {
        // User without namespaces can't have access to mTLS information. Reduce severity to info.
        const informative = this.props.namespaces && this.props.namespaces.length < 1;
        if (informative) {
          AlertUtils.addError($t('tip239'), error, 'default', MessageType.INFO);
        } else {
          AlertUtils.addError($t('tip240'), error, 'default', MessageType.ERROR);
        }
      });
  };

  iconStyle() {
    return kialiStyle({
      marginRight: 10,
      marginLeft: 10,
      width: 13
    });
  }

  finalStatus() {
    if (this.props.autoMTLSEnabled) {
      if (this.props.status === MTLSStatuses.ENABLED) {
        return MTLSStatuses.ENABLED_DEFAULT;
      }
      if (this.props.status === MTLSStatuses.PARTIALLY) {
        return MTLSStatuses.PARTIALLY_DEFAULT;
      }
      return MTLSStatuses.AUTO_DEFAULT;
    }
    return this.props.status;
  }

  render() {
    return (
      <MTLSStatus className={this.iconStyle()} status={this.finalStatus()} statusDescriptors={statusDescriptors} />
    );
  }
}

const mapStateToProps = (state: KialiAppState) => ({
  status: meshWideMTLSStatusSelector(state),
  autoMTLSEnabled: meshWideMTLSEnabledSelector(state),
  namespaces: namespaceItemsSelector(state)
});

const mapDispatchToProps = (dispatch: KialiDispatch) => ({
  setMeshTlsStatus: bindActionCreators(MeshTlsActions.setinfo, dispatch)
});

export const MeshMTLSStatus = connectRefresh(connect(mapStateToProps, mapDispatchToProps)(MeshMTLSStatusComponent));
