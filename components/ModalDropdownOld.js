'use strict';

import React, {Component} from 'react';

import {
  StyleSheet,
  Dimensions,
  View,
  Text,
  TouchableWithoutFeedback,
  TouchableNativeFeedback,
  TouchableOpacity,
  TouchableHighlight,
  Modal,
  ActivityIndicator,
  StatusBar,
  Platform,
  FlatList,
} from 'react-native';

import PropTypes from 'prop-types';

const TOUCHABLE_ELEMENTS = [
  'TouchableHighlight',
  'TouchableOpacity',
  'TouchableWithoutFeedback',
  'TouchableNativeFeedback',
];

class ModalDropdownOld extends Component {
  static propTypes = {
    disabled: PropTypes.bool,
    scrollEnabled: PropTypes.bool,
    defaultIndex: PropTypes.number,
    defaultValue: PropTypes.string,
    options: PropTypes.array,

    accessible: PropTypes.bool,
    animated: PropTypes.bool,
    showsVerticalScrollIndicator: PropTypes.bool,
    keyboardShouldPersistTaps: PropTypes.string,

    style: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.object,
      PropTypes.array,
    ]),
    textStyle: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.object,
      PropTypes.array,
    ]),
    dropdownStyle: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.object,
      PropTypes.array,
    ]),
    dropdownListStyle: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.object,
      PropTypes.array,
    ]),
    dropdownTextStyle: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.object,
      PropTypes.array,
    ]),
    dropdownTextHighlightStyle: PropTypes.oneOfType([
      PropTypes.number,
      PropTypes.object,
      PropTypes.array,
    ]),

    adjustFrame: PropTypes.func,
    renderRow: PropTypes.func,
    renderSeparator: PropTypes.func,
    renderButtonText: PropTypes.func,

    onDropdownWillShow: PropTypes.func,
    onDropdownWillHide: PropTypes.func,
    onSelect: PropTypes.func,
    getValueLabel: PropTypes.func,
    getOptionLabel: PropTypes.func,
    numColumns: PropTypes.number,
  };

  static defaultProps = {
    disabled: false,
    scrollEnabled: true,
    defaultIndex: -1,
    defaultValue: 'Please select...',
    options: null,
    animated: true,
    showsVerticalScrollIndicator: true,
    keyboardShouldPersistTaps: 'never',
    numColumns: 1,
  };

  constructor(props) {
    super(props);

    this._button = null;
    this._buttonFrame = null;

    this.state = {
      accessible: !!props.accessible,
      loading: !props.options,
      showDropdown: false,
      buttonText: props.defaultValue,
      selectedIndex: props.defaultIndex,
      defaultIndex: props.defaultIndex,
      _nextValue: null,
      _nextIndex: null,
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    let {buttonText, selectedIndex, _nextValue, _nextIndex, prevDefaultIndex} =
      prevState;
    const {defaultIndex, defaultValue, options} = nextProps;
    buttonText = _nextValue == null ? buttonText : _nextValue;
    selectedIndex = _nextIndex == null ? selectedIndex : _nextIndex;

    if (prevDefaultIndex !== defaultIndex) {
      selectedIndex = defaultIndex;
    }
    if (selectedIndex < 0) {
      selectedIndex = defaultIndex;
      if (selectedIndex < 0) {
        buttonText = defaultValue;
      }
    }
    return {
      ...prevState,
      loading: !options,
      buttonText,
      selectedIndex,
      _nextValue: null,
      _nextIndex: null,
    };
  }

  render() {
    return (
      <View {...this.props}>
        {this._renderButton()}
        {this._renderModal()}
      </View>
    );
  }

  _updatePosition(callback) {
    if (this._button && this._button.measure) {
      this._button.measure((fx, fy, width, height, px, py) => {
        this._buttonFrame = {x: px, y: py, w: width, h: height};
        callback && callback();
      });
    }
  }

  show() {
    this._updatePosition(() => {
      this.setState({
        showDropdown: true,
      });
    });
  }

  hide() {
    this.setState({
      showDropdown: false,
    });
  }

  select(idx) {
    const {defaultValue, options, defaultIndex, renderButtonText} = this.props;

    let value = defaultValue;
    if (idx == null || !options || idx >= options.length) {
      idx = defaultIndex;
    }

    if (idx >= 0) {
      value = renderButtonText
        ? renderButtonText(options[idx])
        : options[idx].toString();
    }

    this.setState({
      _nextValue: value,
      buttonText: value,
      _nextIndex: idx,
      selectedIndex: idx,
    });
  }

  _renderButton() {
    const {disabled, accessible, children, textStyle, getValueLabel} =
      this.props;
    const {buttonText} = this.state;

    return (
      <TouchableOpacity
        ref={button => (this._button = button)}
        disabled={disabled}
        activeOpacity={0.5}
        accessible={accessible}
        onPress={this._onButtonPress}>
        {children || (
          <View style={styles.button}>
            <Text style={[styles.buttonText, textStyle]} numberOfLines={1}>
              {getValueLabel ? getValueLabel(buttonText) : buttonText}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  _onButtonPress = () => {
    const {onDropdownWillShow} = this.props;
    if (!onDropdownWillShow || onDropdownWillShow() !== false) {
      this.show();
    }
  };

  _renderModal() {
    const {animated, accessible, dropdownStyle} = this.props;
    const {showDropdown, loading} = this.state;
    if (showDropdown && this._buttonFrame) {
      const frameStyle = this._calcPosition();
      const animationType = animated ? 'fade' : 'none';
      return (
        <Modal
          animationType={animationType}
          visible={true}
          transparent={true}
          onRequestClose={this._onRequestClose}
          supportedOrientations={[
            'portrait',
            'portrait-upside-down',
            'landscape',
            'landscape-left',
            'landscape-right',
          ]}>
          <TouchableWithoutFeedback
            accessible={accessible}
            disabled={!showDropdown}
            onPress={this._onModalPress}>
            <View style={styles.modal}>
              <View style={[styles.dropdown, dropdownStyle, frameStyle]}>
                {loading ? this._renderLoading() : this._renderDropdown()}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      );
    }
  }

  _calcPosition() {
    const {dropdownStyle, style, adjustFrame} = this.props;

    const dimensions = Dimensions.get('window');
    const windowWidth = dimensions.width;
    const windowHeight = dimensions.height;

    const dropdownHeight =
      (dropdownStyle && StyleSheet.flatten(dropdownStyle).height) ||
      StyleSheet.flatten(styles.dropdown).height;

    const bottomSpace =
      windowHeight - this._buttonFrame.y - this._buttonFrame.h;
    const rightSpace = windowWidth - this._buttonFrame.x;
    const showInBottom =
      bottomSpace >= dropdownHeight || bottomSpace >= this._buttonFrame.y;
    const showInLeft = rightSpace >= this._buttonFrame.x;
    const statusBar = Platform.select({
      ios: 0,
      android: StatusBar.currentHeight,
    });
    const positionStyle = {
      height: dropdownHeight,
      top: showInBottom
        ? this._buttonFrame.y + this._buttonFrame.h - statusBar
        : Math.max(0, this._buttonFrame.y - dropdownHeight - statusBar),
    };

    if (showInLeft) {
      positionStyle.left = this._buttonFrame.x;
    } else {
      const dropdownWidth =
        (dropdownStyle && StyleSheet.flatten(dropdownStyle).width) ||
        (style && StyleSheet.flatten(style).width) ||
        -1;
      if (dropdownWidth !== -1) {
        positionStyle.width = dropdownWidth;
      }
      positionStyle.right = rightSpace - this._buttonFrame.w;
    }

    return adjustFrame ? adjustFrame(positionStyle) : positionStyle;
  }

  _onRequestClose = () => {
    const {onDropdownWillHide} = this.props;
    if (!onDropdownWillHide || onDropdownWillHide() !== false) {
      this.hide();
    }
  };

  _onModalPress = () => {
    const {onDropdownWillHide} = this.props;
    if (!onDropdownWillHide || onDropdownWillHide() !== false) {
      this.hide();
    }
  };

  _renderLoading() {
    return <ActivityIndicator size="small" />;
  }

  _renderDropdown() {
    const {
      scrollEnabled,
      renderSeparator,
      showsVerticalScrollIndicator,
      keyboardShouldPersistTaps,
      options,
      dropdownListStyle,
      numColumns,
    } = this.props;
    return (
      <FlatList
        numColumns={numColumns}
        scrollEnabled={scrollEnabled}
        style={[styles.list, dropdownListStyle]}
        data={options}
        renderItem={this._renderRow}
        ItemSeparatorComponent={renderSeparator || this._renderSeparator}
        automaticallyAdjustContentInsets={false}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        keyExtractor={(item, index) => index.toString()}
      />
    );
  }

  _renderRow = ({item, separators, index}) => {
    const {
      renderRow,
      dropdownTextStyle,
      dropdownTextHighlightStyle,
      accessible,
      getOptionLabel,
    } = this.props;
    const {selectedIndex} = this.state;
    const key = `row_${index}`;
    const highlighted = index === selectedIndex;
    const row = !renderRow ? (
      <Text
        style={[
          styles.rowText,
          dropdownTextStyle,
          highlighted && styles.highlightedRowText,
          highlighted && dropdownTextHighlightStyle,
        ]}>
        {getOptionLabel ? getOptionLabel(item) : item}
      </Text>
    ) : (
      renderRow(item, index, highlighted)
    );
    const preservedProps = {
      key,
      accessible,
      onPress: () => this._onRowPress(item, index),
    };
    if (TOUCHABLE_ELEMENTS.find(name => name === row.type.displayName)) {
      const props = {...row.props};
      props.key = preservedProps.key;
      props.onPress = preservedProps.onPress;
      const {children} = row.props;
      switch (row.type.displayName) {
        case 'TouchableHighlight': {
          return <TouchableHighlight {...props}>{children}</TouchableHighlight>;
        }
        case 'TouchableOpacity': {
          return <TouchableOpacity {...props}>{children}</TouchableOpacity>;
        }
        case 'TouchableWithoutFeedback': {
          return (
            <TouchableWithoutFeedback {...props}>
              {children}
            </TouchableWithoutFeedback>
          );
        }
        case 'TouchableNativeFeedback': {
          return (
            <TouchableNativeFeedback {...props}>
              {children}
            </TouchableNativeFeedback>
          );
        }
        default:
          break;
      }
    }
    return <TouchableHighlight {...preservedProps}>{row}</TouchableHighlight>;
  };

  _onRowPress(rowData, rowID) {
    const {onSelect, renderButtonText, onDropdownWillHide} = this.props;
    if (!onSelect || onSelect(rowID, rowData) !== false) {
      // highlightRow(sectionID, rowID);
      const value =
        (renderButtonText && renderButtonText(rowData)) || rowData.toString();
      this.setState({
        buttonText: value,
        selectedIndex: rowID,
        _nextValue: value,
        _nextIndex: rowID,
      });
    }
    if (!onDropdownWillHide || onDropdownWillHide() !== false) {
      this.setState({
        showDropdown: false,
      });
    }
  }

  _renderSeparator = () => {
    return <View style={styles.separator} />;
  };
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 12,
  },
  modal: {
    flexGrow: 1,
  },
  dropdown: {
    position: 'absolute',
    height: (33 + StyleSheet.hairlineWidth) * 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'lightgray',
    borderRadius: 2,
    backgroundColor: 'white',
    justifyContent: 'center',
  },
  loading: {
    alignSelf: 'center',
  },
  list: {
    //flexGrow: 1,
    borderRadius: 8,
  },
  rowText: {
    paddingHorizontal: 6,
    paddingVertical: 10,
    fontSize: 11,
    color: 'gray',
    backgroundColor: 'white',
    textAlignVertical: 'center',
  },
  highlightedRowText: {
    color: 'black',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'lightgray',
  },
});

export default ModalDropdownOld;
