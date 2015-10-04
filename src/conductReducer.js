import invariant from 'invariant'
import {forEach} from 'lodash'

import {INITIALIZE, REQUEST, SUCCESS, FAIL, EXPIRE_CONDUCT} from './constants'

//@TODO transientReducer()
var initialState = {
  _conduct: {
    processing: {},
    retry: {},
  }
}

//@TODO rewrite this to just deal with substate
export default function conductReducer(entireState = initialState, action){

  //@TODO only receive state partial to begin with
  let state = entireState._conduct

  //initialize
  if(action.type === INITIALIZE){
    let processing = {...state.processing}
    let retry = {...state.retry}
    console.log('on initialize', processing, retry)
    forEach(processing, (latentAction, id) => {
      retry[id] = latentAction
      delete processing[id]
    })
    forEach(retry, (latentAction, id) => {
      if(!latentAction || !latentAction._conduct){
        delete retry[id]
      }
    })
    return {...state, processing, retry}
  }

  //expire conduct
  if(action.type === EXPIRE_CONDUCT){
    let id = action.payload._conduct.id
    let processing = {...state.processing}
    let retry = {...state.retry}
    delete processing[id]
    delete retry[id]
    return {...state, processing, retry}
  }

  //handle conduct phases
  if(action._conduct){
    invariant(action._conduct.handled === true, 'conducts must be handled before it hits reducer!')
    if(action._conduct.phase === REQUEST){
      //move to processing
      let processing = {...state.processing}
      let retry = {...state.retry}
      processing[action._conduct.id] = action
      delete retry[action._conduct.id]
      return {...state, processing: processing, retry: retry}
    }
    if(action._conduct.phase === SUCCESS){
      //clear from queues
      let processing = {...state.processing}
      delete processing[action._conduct.id]
      let retry = {...state.retry}
      delete retry[action._conduct.id]
      return {...state, processing, retry}
    }
    if(action._conduct.phase === FAIL){
      //move to retry
      let processing = {...state.processing}
      let retry = {...state.retry}
      let requestAction = {...processing[action._conduct.id]}

      retry[action._conduct.id] = requestAction
      delete processing[action._conduct.id]// = undefined
      return {...state, processing, retry}
    }
  }

  //default
  else{
    return state
  }
}
