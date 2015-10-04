# Redux Conduct
Primitive Offline Sync

This is a simple method for supporting offline sync as "one way linking". When two way concurrency such as scuttlebutt/CRDT is not possible (e.g. third party api's) or is not desired (complexity), this is a simple alternative.

The basic concept is, try to execute the action, on failure add it to a retry queue. Every so often process the retry queue until success is achieved.

Setup
```js
import {conductor, startConductor} from 'redux-conduct'
import {persistStore} from 'redux-persist'

//...

const store = compose(
  conductor()
)(createStore)(reducer)

//...

persistStore(store, {}, (err) => {
  //does not depend on redux-persist, any persistence will work
  //be sure to start conductor *after* persistence is complete
  startConductor(store).addIntervalProcessor(1000*60)
})

```
ActionCreator
```js
import { createConduct } from 'redux-owl'

export function createRecordTest(record) {
  return createConduct({
    type: RECORD_CREATE,
    payload: record,
  })
}
```
Async Action / Side Effects
```js
//in some side effect handler
handleConduct(action, (success, fail) => {
  RecordClient.createRecord(action.payload, (err, record) => {
    if(err){ finish(error(primeActions.RECORD_UPDATE_FAIL(localRecord))) }
    else{ finish(success(primeActions.RECORD_UPDATE_SUCCESS(record))) }
  })
})
```
