import { AsyncLocalStorage } from 'node:async_hooks'
import { createClient } from '@supabase/supabase-js'

const requestState = new AsyncLocalStorage()
const collections = new Map()
const maps = new Map()
let client

export function supabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured')
  client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return client
}

export function afterStateCommit(callback) {
  requestState.getStore()?.afterCommit.push(callback)
}

export function afterStateFailure(callback) {
  requestState.getStore()?.afterFailure.push(callback)
}

function activeState() {
  return requestState.getStore()?.data
}

export function registerCollection(name, initial = []) {
  const target = [...initial]
  collections.set(name, target)
  return new Proxy(target, {
    get(array, property, receiver) {
      const current = activeState()?.[name] ?? array
      return Reflect.get(current, property, current)
    },
    set(array, property, value, receiver) {
      const current = activeState()?.[name] ?? array
      return Reflect.set(current, property, value, current)
    },
    has(array, property) {
      return Reflect.has(activeState()?.[name] ?? array, property)
    },
    ownKeys(array) {
      const current = activeState()?.[name] ?? array
      return [...new Set([...Reflect.ownKeys(array), ...Reflect.ownKeys(current)])]
    },
    getOwnPropertyDescriptor(array, property) {
      return Reflect.getOwnPropertyDescriptor(activeState()?.[name] ?? array, property)
    },
    deleteProperty(array, property) {
      return Reflect.deleteProperty(activeState()?.[name] ?? array, property)
    },
  })
}

export function registerMap(name, initial = new Map()) {
  const target = Object.fromEntries(initial)
  maps.set(name, target)
  const current = () => activeState()?.[name] ?? target
  return {
    get: (key) => current()[key],
    set(key, value) {
      current()[key] = value
      return this
    },
    delete(key) {
      if (!Object.hasOwn(current(), key)) return false
      delete current()[key]
      return true
    },
  }
}

function initialState() {
  return Object.fromEntries([
    ...collections,
    ...maps,
  ].map(([name, value]) => [name, JSON.parse(JSON.stringify(value))]))
}

async function getState() {
  const db = supabase()
  const { data: rows, error } = await db.from('app_state').select('state_key, version, data')
  if (error) throw error

  const defaults = initialState()
  const existing = new Set((rows ?? []).map((row) => row.state_key))
  const missing = Object.entries(defaults)
    .filter(([name]) => !existing.has(name))
    .map(([state_key, data]) => ({ state_key, version: 0, data }))
  if (missing.length) {
    const { error: insertError } = await db.from('app_state')
      .upsert(missing, { onConflict: 'state_key', ignoreDuplicates: true })
    if (insertError) throw insertError
    return getState()
  }

  const versions = {}
  const data = { ...defaults }
  for (const row of rows ?? []) {
    versions[row.state_key] = row.version
    data[row.state_key] = row.data
  }
  return { versions, data }
}

async function saveState(versions, data, keys) {
  const changes = Object.fromEntries(keys.map((key) => [key, {
    version: versions[key],
    data: data[key],
  }]))
  const { data: saved, error } = await supabase().rpc('update_app_state', { p_changes: changes })
  if (error) throw error
  if (saved !== true) throw new Error('State changed in another request')
}

export function persistRequestState(req, res, next) {
  getState().then(({ versions, data }) => {
    const original = Object.fromEntries(Object.keys(initialState())
      .map((key) => [key, JSON.stringify(data[key])]))
    const store = { data, afterCommit: [], afterFailure: [] }
    const end = res.end.bind(res)
    let ended = false
    res.end = (...args) => {
      if (ended) return res
      ended = true
      const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
      const changedKeys = Object.keys(original)
        .filter((key) => JSON.stringify(data[key]) !== original[key])
      const runFailureCallbacks = async () => {
        await Promise.all(store.afterFailure.map(async (callback) => {
          try {
            await callback()
          } catch (error) {
            console.error('Failed to clean up an unreferenced upload:', error)
          }
        }))
      }
      if (!isMutation || res.statusCode >= 400 || !changedKeys.length) {
        runFailureCallbacks().then(() => end(...args))
        return res
      }

      saveState(versions, data, changedKeys).then(
        async () => {
          await Promise.all(store.afterCommit.map(async (callback) => {
            try {
              await callback()
            } catch (error) {
              console.error('Failed to clean up Supabase storage:', error)
            }
          }))
          end(...args)
        },
        async (error) => {
          console.error('Failed to persist Supabase app state:', error)
          await runFailureCallbacks()
          res.statusCode = error.message === 'State changed in another request' ? 409 : 503
          res.removeHeader('Content-Length')
          res.removeHeader('ETag')
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          end(JSON.stringify({
            error: res.statusCode === 409
              ? 'ข้อมูลเปลี่ยนโดยผู้ใช้อื่น กรุณาลองใหม่'
              : 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่ภายหลัง',
          }))
        },
      )
      return res
    }
    requestState.run(store, next)
  }).catch((error) => {
    console.error('Failed to load Supabase app state:', error)
    res.status(503).json({ error: 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่ภายหลัง' })
  })
}

export async function upsertUser(user) {
  const { versions, data } = await getState()
  const users = data.users ?? []
  const index = users.findIndex((entry) => entry.email === user.email)
  if (index === -1) {
    const id = user.id > 0 ? user.id : Math.max(0, ...users.map((entry) => entry.id)) + 1
    users.push({ ...user, id })
  }
  else users[index] = { ...users[index], ...user, id: users[index].id }
  data.users = users
  await saveState(versions, data, ['users'])
  return index === -1 ? 'created' : 'updated'
}
