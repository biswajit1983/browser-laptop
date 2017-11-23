/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global describe, it, before, after, afterEach */
const assert = require('assert')
const Immutable = require('immutable')
const sinon = require('sinon')
const mockery = require('mockery')

require('../../../braveUnit')
const ledgerState = require('../../../../../app/common/state/ledgerState')
const appActions = require('../../../../../js/actions/appActions')
const settings = require('../../../../../js/constants/settings')

describe('ledgerState unit test', function () {
  // State
  const defaultState = Immutable.fromJS({
    ledger: {}
  })

  const stateWithData = Immutable.fromJS({
    ledger: {
      publisherTime: 1
    }
  })

  // settings
  let paymentsEnabled = true

  before(function () {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    })

    mockery.registerMock('../../../js/settings', {
      getSetting: (settingKey) => {
        switch (settingKey) {
          case settings.PAYMENTS_ENABLED:
            return paymentsEnabled
        }
        return false
      }
    })
  })

  describe('setLedgerValue', function () {
    it('null case', function () {
      const result = ledgerState.setLedgerValue(defaultState)
      assert.deepEqual(result.toJS(), defaultState.toJS())
    })

    it('key is provided', function () {
      const result = ledgerState.setLedgerValue(defaultState, 'publisherTime', 1)
      assert.deepEqual(result.toJS(), stateWithData.toJS())
    })
  })

  describe('getLedgerValue', function () {
    it('null case', function () {
      const result = ledgerState.getLedgerValue(defaultState)
      assert.deepEqual(result, null)
    })

    it('key is provided', function () {
      const result = ledgerState.getLedgerValue(stateWithData, 'publisherTime')
      assert.deepEqual(result, 1)
    })
  })

  describe('savePromotion', function () {
    let setActivePromotionSpy

    before(function () {
      setActivePromotionSpy = sinon.spy(ledgerState, 'setActivePromotion')
    })

    afterEach(function () {
      setActivePromotionSpy.reset()
    })

    after(function () {
      setActivePromotionSpy.restore()
    })

    it('null case', function () {
      const result = ledgerState.savePromotion(defaultState)
      assert.deepEqual(result.toJS(), defaultState.toJS())
      assert(setActivePromotionSpy.notCalled)
    })

    it('promotion is regular object', function () {
      const result = ledgerState.savePromotion(defaultState, {
        promotionId: '1'
      })
      const expectedState = defaultState
        .setIn(['ledger', 'promotion'], Immutable.fromJS({
          activeState: 'disabledWallet',
          promotionId: '1',
          remindTimestamp: -1
        }))
      assert.deepEqual(result.toJS(), expectedState.toJS())
      assert(setActivePromotionSpy.calledOnce)
    })

    it('we already have the same promotion', function () {
      const state = defaultState
        .setIn(['ledger', 'promotion'], Immutable.fromJS({
          promotionId: '1',
          remindTimestamp: 10,
          stateWallet: {
            disabledWallet: {
              notification: {
                message: 'Hello'
              }
            }
          }
        }))
      const result = ledgerState.savePromotion(state, Immutable.fromJS({
        promotionId: '1',
        stateWallet: {
          disabledWallet: {
            notification: {
              message: 'New Hello'
            }
          }
        }
      }))
      const expectedState = defaultState
        .setIn(['ledger', 'promotion'], Immutable.fromJS({
          activeState: 'disabledWallet',
          promotionId: '1',
          remindTimestamp: 10,
          stateWallet: {
            disabledWallet: {
              notification: {
                message: 'New Hello'
              }
            }
          }
        }))
      assert.deepEqual(result.toJS(), expectedState.toJS())
      assert(setActivePromotionSpy.calledOnce)
    })

    describe('existing promotion', function () {
      let hideNotificationSpy
      before(function () {
        hideNotificationSpy = sinon.spy(appActions, 'hideNotification')
      })

      it('we have existing promotion, but is empty', function () {
        const state = defaultState
          .setIn(['ledger', 'promotion'], Immutable.Map())

        const result = ledgerState.savePromotion(state, Immutable.fromJS({
          promotionId: '1'
        }))
        const expectedState = state
          .setIn(['ledger', 'promotion'], Immutable.fromJS({
            activeState: 'disabledWallet',
            promotionId: '1',
            remindTimestamp: -1
          }))
        assert.deepEqual(result.toJS(), expectedState.toJS())
        assert(setActivePromotionSpy.calledOnce)
        assert(hideNotificationSpy.notCalled)
      })

      it('we have existing promotion', function () {
        const state = defaultState
          .setIn(['ledger', 'promotion'], Immutable.fromJS({
            promotionId: '2',
            activeState: 'disabledWallet',
            remindTimestamp: 10,
            stateWallet: {
              disabledWallet: {
                notification: {
                  message: 'Hello'
                }
              }
            }
          }))
        const result = ledgerState.savePromotion(state, Immutable.fromJS({
          promotionId: '1',
          stateWallet: {
            disabledWallet: {
              notification: {
                message: 'New Hello'
              }
            }
          }
        }))
        const expectedState = state
          .setIn(['ledger', 'promotion'], Immutable.fromJS({
            activeState: 'disabledWallet',
            promotionId: '1',
            remindTimestamp: -1,
            stateWallet: {
              disabledWallet: {
                notification: {
                  message: 'New Hello'
                }
              }
            }
          }))
        assert.deepEqual(result.toJS(), expectedState.toJS())
        assert(setActivePromotionSpy.calledOnce)
        assert(hideNotificationSpy.withArgs('Hello').calledOnce)
      })
    })
  })

  describe('getPromotion', function () {
    it('no promotion', function () {
      const result = ledgerState.getPromotion(defaultState)
      assert.deepEqual(result.toJS(), {})
    })

    it('promotion exists', function () {
      const promotion = {
        promotionId: '2',
        activeState: 'disabledWallet',
        remindTimestamp: 10,
        stateWallet: {
          disabledWallet: {
            notification: {
              message: 'Hello'
            }
          }
        }
      }
      const state = defaultState.setIn(['ledger', 'promotion'], Immutable.fromJS(promotion))
      const result = ledgerState.getPromotion(state)
      assert.deepEqual(result.toJS(), promotion)
    })
  })

  describe('setActivePromotion', function () {
    let setPromotionPropSpy

    before(function () {
      setPromotionPropSpy = sinon.spy(ledgerState, 'setPromotionProp')
    })

    afterEach(function () {
      setPromotionPropSpy.reset()
    })

    after(function () {
      setPromotionPropSpy.restore()
    })

    it('promotion is missing', function () {
      const result = ledgerState.setActivePromotion(defaultState)
      assert.deepEqual(result.toJS(), defaultState.toJS())
      assert(setPromotionPropSpy.notCalled)
    })

    it('payment status is not provided', function () {
      paymentsEnabled = false
      const state = defaultState.setIn(['ledger', 'promotion'], Immutable.fromJS({
        promotionId: '1'
      }))
      const result = ledgerState.setActivePromotion(state)
      const expectedState = state
        .setIn(['ledger', 'promotion', 'activeState'], 'disabledWallet')
      assert.deepEqual(result.toJS(), expectedState.toJS())
      assert(setPromotionPropSpy.calledOnce)
      paymentsEnabled = true
    })

    it('payment is disabled', function () {
      const state = defaultState.setIn(['ledger', 'promotion'], Immutable.fromJS({
        promotionId: '1'
      }))
      const result = ledgerState.setActivePromotion(state, false)
      const expectedState = state
        .setIn(['ledger', 'promotion', 'activeState'], 'disabledWallet')
      assert.deepEqual(result.toJS(), expectedState.toJS())
      assert(setPromotionPropSpy.calledOnce)
    })

    it('payment is enabled, but wallet is empty', function () {
      const state = defaultState.setIn(['ledger', 'promotion'], Immutable.fromJS({
        promotionId: '1'
      }))
      const result = ledgerState.setActivePromotion(state, true)
      const expectedState = state
        .setIn(['ledger', 'promotion', 'activeState'], 'emptyWallet')
      assert.deepEqual(result.toJS(), expectedState.toJS())
      assert(setPromotionPropSpy.calledOnce)
    })

    it('payment is enabled and wallet is founded', function () {
      const state = defaultState
        .setIn(['ledger', 'info', 'balance'], 10)
        .setIn(['ledger', 'promotion'], Immutable.fromJS({
          promotionId: '1'
        }))
      const result = ledgerState.setActivePromotion(state, true)
      const expectedState = state
        .setIn(['ledger', 'promotion', 'activeState'], 'fundedWallet')
      assert.deepEqual(result.toJS(), expectedState.toJS())
      assert(setPromotionPropSpy.calledOnce)
    })
  })

  describe('getActivePromotion', function () {
    it('active state is missing', function () {
      const result = ledgerState.getActivePromotion(defaultState)
      assert.deepEqual(result.toJS(), {})
    })

    it('active state is provided, but promotion do not have this promotion', function () {
      const state = defaultState.setIn(['ledger', 'promotion', 'activeState'], 'emptyWallet')
      const result = ledgerState.getActivePromotion(state)
      assert.deepEqual(result.toJS(), {})
    })

    it('promotion is found', function () {
      const notification = {
        notification: {
          message: 'Hi'
        }
      }
      const state = defaultState
        .setIn(['ledger', 'promotion', 'activeState'], 'emptyWallet')
        .setIn(['ledger', 'promotion', 'stateWallet', 'emptyWallet'], Immutable.fromJS(notification))
      const result = ledgerState.getActivePromotion(state)
      assert.deepEqual(result.toJS(), notification)
    })
  })

  describe('setPromotionProp', function () {
    it('null case', function () {
      const result = ledgerState.setPromotionProp(defaultState)
      assert.deepEqual(result.toJS(), defaultState.toJS())
    })

    it('prop is set', function () {
      const result = ledgerState.setPromotionProp(defaultState, 'promotionId', '1')
      const expectedState = defaultState.setIn(['ledger', 'promotion', 'promotionId'], '1')
      assert.deepEqual(result.toJS(), expectedState.toJS())
    })
  })

  describe('removePromotion', function () {
    it('null case', function () {
      const result = ledgerState.removePromotion(defaultState)
      const expectedState = defaultState.setIn(['ledger', 'promotion'], Immutable.Map())
      assert.deepEqual(result.toJS(), expectedState.toJS())
    })

    it('remove promotion', function () {
      const state = defaultState.setIn(['ledger', 'promotion'], Immutable.fromJS({
        promotionId: '1'
      }))
      const result = ledgerState.removePromotion(state)
      const expectedState = state.setIn(['ledger', 'promotion'], Immutable.Map())
      assert.deepEqual(result.toJS(), expectedState.toJS())
    })
  })

  describe('remindMeLater', function () {
    let fakeClock

    before(function () {
      fakeClock = sinon.useFakeTimers()
      fakeClock.tick(6000)
    })

    after(function () {
      fakeClock.restore()
    })

    it('null case', function () {
      const result = ledgerState.remindMeLater(defaultState)
      const expectedState = defaultState.setIn(['ledger', 'promotion', 'remindTimestamp'], 86406000)
      assert.deepEqual(result.toJS(), expectedState.toJS())
    })

    it('custom time', function () {
      const result = ledgerState.remindMeLater(defaultState, 50)
      const expectedState = defaultState.setIn(['ledger', 'promotion', 'remindTimestamp'], 6050)
      assert.deepEqual(result.toJS(), expectedState.toJS())
    })
  })

  describe('getPromotionNotification', function () {
    it('promotion is missing', function () {
      const result = ledgerState.getPromotionNotification(defaultState)
      assert.deepEqual(result.toJS(), {})
    })

    it('we do not have active promotion', function () {
      const state = defaultState.setIn(['ledger', 'promotion', 'activeState'], 'emptyWallet')
      const result = ledgerState.getPromotionNotification(state)
      assert.deepEqual(result.toJS(), {})
    })

    it('notification is missing', function () {
      const state = defaultState
        .setIn(['ledger', 'promotion', 'activeState'], 'emptyWallet')
        .setIn(['ledger', 'promotion', 'stateWallet', 'emptyWallet'], Immutable.Map())
      const result = ledgerState.getPromotionNotification(state)
      assert.deepEqual(result.toJS(), {})
    })

    it('notification is returned', function () {
      const notification = {
        message: 'Hello'
      }
      const state = defaultState
        .setIn(['ledger', 'promotion', 'activeState'], 'emptyWallet')
        .setIn(['ledger', 'promotion', 'stateWallet', 'emptyWallet', 'notification'], Immutable.fromJS(notification))
      const result = ledgerState.getPromotionNotification(state)
      assert.deepEqual(result.toJS(), notification)
    })
  })

  describe('setPromotionNotificationProp', function () {
    it('null case', function () {
      const result = ledgerState.setPromotionNotificationProp(defaultState)
      assert.deepEqual(result.toJS(), defaultState.toJS())
    })

    it('active state is missing', function () {
      const result = ledgerState.setPromotionNotificationProp(defaultState, 'message')
      assert.deepEqual(result.toJS(), defaultState.toJS())
    })

    it('prop is set', function () {
      const state = defaultState
        .setIn(['ledger', 'promotion', 'activeState'], 'emptyWallet')
      const result = ledgerState.setPromotionNotificationProp(state, 'message', 'Hello')
      const expectedState = state
        .setIn(['ledger', 'promotion', 'stateWallet', 'emptyWallet', 'notification', 'message'], 'Hello')
      assert.deepEqual(result.toJS(), expectedState.toJS())
    })
  })

  describe('getAboutPromotion', function () {
    it('no active promotion', function () {
      const result = ledgerState.getAboutPromotion(defaultState)
      assert.deepEqual(result.toJS(), {})
    })

    it('active promotion (no claim)', function () {
      const promo = Immutable.fromJS({
        notification: {
          message: 'Hello'
        }
      })
      const state = defaultState
        .setIn(['ledger', 'promotion', 'activeState'], 'emptyWallet')
        .setIn(['ledger', 'promotion', 'stateWallet', 'emptyWallet'], promo)
      const result = ledgerState.getAboutPromotion(state)
      assert.deepEqual(result.toJS(), promo.toJS())
    })

    it('promotion was claimed', function () {
      const promo = Immutable.fromJS({
        notification: {
          message: 'Hello'
        }
      })
      const state = defaultState
        .setIn(['ledger', 'promotion', 'activeState'], 'emptyWallet')
        .setIn(['ledger', 'promotion', 'claimedTimestamp'], 10000)
        .setIn(['ledger', 'promotion', 'stateWallet', 'emptyWallet'], promo)
      const result = ledgerState.getAboutPromotion(state)
      const expectedPromo = promo.set('claimedTimestamp', 10000)
      assert.deepEqual(result.toJS(), expectedPromo.toJS())
    })
  })
})
