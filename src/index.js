import {forEach} from 'lodash'
import invariant from 'invariant'

import {INITIALIZE, REQUEST, SUCCESS, FAIL, EXPIRE_CONDUCT} from './constants'

import conductReducer from './conductReducer'

//4 attempts, 10 days past.
const defaultConfig = {
  expireConditions: {
    attempts: 4,
    timeElapsed: 1000*60*60*24*10
  },
  intervalBackoff: [0, 1000*60, 1000*60*60, 1000*60*60*24],
}

export function createConduct(action, config){
  invariant(typeof action === 'object', 'Conduct action must be an object.')

  config = config || defaultConfig
  return {
    ...action,
    _conduct: {
      id: Math.floor(Math.random()*999999999999),
      time: Date.now(),
      config: config,
      handled: false,
      phase: REQUEST,
      attempt: 1,
    },
  }
}

export function handleConduct(action, cb){
  invariant(typeof action._conduct === 'object', 'conduct cannot process action without conduct meta')

  //@NOTE mutation here, purely as a development conveinence to catch errors, no functionality change
  action._conduct.handled = true

  cb(success, fail)

  function success(rawAction){
    return {
      ...rawAction,
      _conduct: {...action._conduct, phase: SUCCESS}
    }
  }
  function fail(rawAction){
    return {
      ...rawAction,
      _conduct: {...action._conduct, phase: FAIL}
    }
  }
}

function liftReducer(reducer){
  return function(state, action){
    let finalState = reducer(state, action)
    //@TODO is this reasonable to use a lifted reducer to store sibling state?
    let _conduct = conductReducer(state, action)
    let finalConductState = {...finalState, _conduct}

    return finalConductState
  }
}

export function conductor(){
  return function(next){
    return function(reducer, initialState){
      const liftedReducer = liftReducer(reducer)
      const store = next(liftedReducer, initialState)
      return store
    }
  }
}

export function startConductor({dispatch, getState}){
  let reducerKey = '_conduct'
  dispatch(initialize())

  function processor(predicate){
    let state = getState()[reducerKey]
    forEach(state.retry, (action) => {
      if(isConductExpired(action)){
        dispatch(expireConduct(action))
        return
      }
      if(!predicate || predicate(action) === true){
        dispatch(createRetryAction(action))
      }
    })
  }

  function processorInterval(){
    processor(intervalPredicate)
  }

  function intervalPredicate(action){
    if(action._conduct.attempt > action._conduct.config.intervalBackoff.length){
      return false
    }
    let nextTimeDelta = action._conduct.config.intervalBackoff[action._conduct.attempt-1]
    if(action._conduct.time + nextTimeDelta > Date.now()){
      return false
    }
    return true
  }

  var conductorHandle = {
    addIntervalProcessor: (delta) => {
      setInterval(processorInterval, delta)
      return conductorHandle
    },
    addProcessor: (cb) => {
      cb(processor)
      return conductorHandle
    }
  }

  return conductorHandle
}

function isConductExpired(action){
  let attempts = action._conduct.attempt
  let expireConditions = action._conduct.config.expireConditions
  let timeSinceFirst = Date.now() - action._conduct.time
  if(attempts >= expireConditions.attempts && timeSinceFirst > expireConditions.timeElapsed){
    return true
  }
  return false
}

function initialize(){
  return {
    type: INITIALIZE
  }
}

function expireConduct(action){
  return {
    type: EXPIRE_CONDUCT,
    payload: action
  }
}

function createRetryAction(action){
  return {
    ...action,
    _conduct: { ...action._conduct, phase: REQUEST, attempt: action._conduct.attempt+1 },
  }
}
