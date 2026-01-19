/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ServiceAccount } from './types'

// Helper to base64url encode
const base64UrlEncode = (str: string) => {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const base64UrlEncodeBuffer = (buf: ArrayBuffer) => {
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(buf)))
}

/**
 * CUSTOM FIREBASE REST SERVICE
 *
 * IMPORTANT FOR AGENTS: This is NOT the standard 'firebase-admin' or 'firebase' SDK.
 * It is a lightweight REST implementation for Cloudflare Compatibility.
 *
 * - Use 'uploadFile(bucket, path, data, type)' NOT 'file().save()'.
 * - Use 'getCollection()', 'getDocument()', 'createDocument()', etc.
 * - Always check the method signatures below before using.
 */
export class FirebaseRestService {
  private serviceAccount: ServiceAccount
  private token: string | null = null
  private tokenExpiresAt: number = 0
  public projectId: string

  constructor(serviceAccount: ServiceAccount) {
    this.serviceAccount = serviceAccount
    this.projectId = serviceAccount.project_id
  }

  private async getAccessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000)
    if (this.token && this.tokenExpiresAt > now + 30) {
      return this.token
    }

    const alg = 'RS256'
    const header = { alg, typ: 'JWT' }
    const claimSet = {
      iss: this.serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: this.serviceAccount.token_uri,
      exp: now + 3600,
      iat: now,
    }

    const encodedHeader = base64UrlEncode(JSON.stringify(header))
    const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet))
    const unsignedToken = `${encodedHeader}.${encodedClaimSet}`

    // Parse Private Key (PEM to CryptoKey)
    // Basic PEM parsing
    const pem = this.serviceAccount.private_key
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '')

    const binaryKey = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0))

    const key = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign'],
    )

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(unsignedToken),
    )

    const jwt = `${unsignedToken}.${base64UrlEncodeBuffer(signature)}`

    // Exchange JWT for Access Token
    const params = new URLSearchParams()
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer')
    params.append('assertion', jwt)

    const res = await fetch(this.serviceAccount.token_uri, {
      method: 'POST',
      body: params,
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Failed to get access token: ${text}`)
    }

    const data = await res.json()
    this.token = data.access_token
    this.tokenExpiresAt = now + data.expires_in
    return this.token!
  }

  // --- Firestore ---

  async getCollection<T = any>(
    collection: string,
    orderByField?: string,
    direction: 'ASC' | 'DESC' = 'DESC',
  ) {
    const token = await this.getAccessToken()
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/${collection}`

     
    let allDocuments: any[] = []
    let nextPageToken: string | undefined = undefined
    let pageCount = 0
    const MAX_PAGES = 50 // Safety limit ~1000-10000 docs depending on pageSize default

    do {
      const result = await this.fetchCollectionPage(
        baseUrl,
        token,
        orderByField,
        direction,
        nextPageToken,
      )

      if (result === null) return [] // 404 - empty collection

      allDocuments = allDocuments.concat(result.documents)
      nextPageToken = result.nextPageToken
      pageCount++
    } while (nextPageToken && pageCount < MAX_PAGES)

    if (nextPageToken) {
      console.warn(
        `getCollection hit safety limit of ${MAX_PAGES} pages. Some results may be missing.`,
      )
    }

    return allDocuments.map((doc) => this.mapFirestoreDoc(doc)) as T[]
  }

  /** Helper to fetch a single page of collection results */
  private async fetchCollectionPage(
    baseUrl: string,
    token: string,
    orderByField?: string,
    direction: 'ASC' | 'DESC' = 'DESC',
    pageToken?: string,
     
  ): Promise<{ documents: any[]; nextPageToken?: string } | null> {
    const params = new URLSearchParams()

    if (orderByField) {
      const dir = direction === 'DESC' ? 'desc' : 'asc'
      params.append('orderBy', `${orderByField} ${dir}`)
    }

    if (pageToken) {
      params.append('pageToken', pageToken)
    }

    params.append('pageSize', '300')

    const queryString = params.toString()
    const url = queryString ? `${baseUrl}?${queryString}` : baseUrl

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Firestore GET failed: ${res.statusText}`)

    const data = await res.json()
    return {
      documents: data.documents && Array.isArray(data.documents) ? data.documents : [],
      nextPageToken: data.nextPageToken,
    }
  }

  async getDocument<T = any>(collection: string, id: string) {
    const token = await this.getAccessToken()
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/${collection}/${id}`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Firestore GET DOC failed: ${res.statusText}`)

    const data = await res.json()
    return this.mapFirestoreDoc(data) as T
  }

   
  async createDocument(collection: string, id: string | null, data: any) {
    const token = await this.getAccessToken()
    let url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/${collection}`

    // If ID is provided, use patch (upsert-like behavior) or explicit ID creation
    // To support set() behavior we can use PATCH with documentId if we want to name it
    // But standard REST API for named doc creation is:
    // POST .../collection?documentId=ID

    // NOTE: Creating user_favorites subcollections requires correctly constructing path
    // Firestore REST path: documents/users/{userId}/favorites

    // Handle deep paths vs simple collections
    // If collection contains slashes, we assume it's a full path relative to 'documents'

    const fields = this.toFirestoreFields(data)

    if (id) {
      url += `?documentId=${id}`
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Firestore CREATE failed: ${text}`)
    }

    return await res.json()
  }

   
  async setDocument(collection: string, id: string, data: any, _merge = false) {
    // Uses PATCH to update/create
    const token = await this.getAccessToken()
    let url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/${collection}/${id}`

    const fields = this.toFirestoreFields(data)

    // Construct updateMask if merging
    if (_merge) {
      const params = new URLSearchParams()
      // We must specify which fields to update to avoid replacing the document
      Object.keys(data).forEach((key) => {
        params.append('updateMask.fieldPaths', key)
      })

      // If there are fields to update, append to URL
      const queryString = params.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    })

    if (!res.ok) {
      const text = await res.text()
      try {
        const errorBody = JSON.parse(text)
        console.error('Firestore SET failed JSON:', JSON.stringify(errorBody, null, 2))
      } catch {
        console.error('Firestore SET failed TEXT:', text)
      }
      throw new Error(`Firestore SET failed: ${text}`)
    }

    return await res.json()
  }

   
  async updateDocument(collection: string, id: string, data: any) {
    return this.setDocument(collection, id, data, true)
  }

  async deleteDocument(collection: string, id: string) {
    const token = await this.getAccessToken()
    const url = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents/${collection}/${id}`

    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      throw new Error(`Firestore DELETE failed: ${res.statusText}`)
    }
  }

  // --- Sub-collection Helpers ---

  async getSubCollection<T = any>(
    collection: string,
    id: string,
    subCollection: string,
    orderByField?: string,
    direction: 'ASC' | 'DESC' = 'DESC',
  ) {
    return this.getCollection<T>(`${collection}/${id}/${subCollection}`, orderByField, direction)
  }

  async getSubDocument<T = any>(
    collection: string,
    id: string,
    subCollection: string,
    subId: string,
  ) {
    return this.getDocument<T>(`${collection}/${id}/${subCollection}`, subId)
  }

  async addSubDocument(
    collection: string,
    id: string,
    subCollection: string,
    subId: string,
    data: any,
  ) {
    return this.setDocument(`${collection}/${id}/${subCollection}`, subId, data)
  }

  // --- Storage ---

  async uploadFile(
    bucketName: string,
    path: string,
    data: Uint8Array | ArrayBuffer,
    contentType: string,
  ) {
    const token = await this.getAccessToken()
    const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(path)}`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': contentType,
      },
      body: data as BodyInit,
    })

    if (!res.ok) throw new Error(`Storage UPLOAD failed: ${res.statusText}`)
    return await res.json()
  }

  async downloadFile(bucketName: string, path: string) {
    const token = await this.getAccessToken()
    const url = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Storage DOWNLOAD failed: ${res.statusText}`)

    return await res.arrayBuffer()
  }

  async getFileMetadata(bucketName: string, path: string) {
    const token = await this.getAccessToken()
    const url = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeURIComponent(path)}`

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (res.status === 404) return null
    return await res.json()
  }

  // --- Helpers ---
   
  private mapFirestoreDoc(doc: any) {
    const id = doc.name.split('/').pop()
    const data = this.fromFirestoreFields(doc.fields)
    return { id, ...data }
  }

   
  private fromFirestoreFields(fields: any): any {
    if (!fields) return {}
     
    const obj: any = {}
    for (const key in fields) {
      const val = fields[key]
      if (val.stringValue !== undefined) obj[key] = val.stringValue
      else if (val.integerValue !== undefined) obj[key] = Number(val.integerValue)
      else if (val.doubleValue !== undefined) obj[key] = Number(val.doubleValue)
      else if (val.booleanValue !== undefined) obj[key] = val.booleanValue
      else if (val.timestampValue !== undefined) obj[key] = val.timestampValue
      else if (val.arrayValue !== undefined) {
         
        obj[key] = (val.arrayValue.values || []).map((v: any) => this.fromFirestoreValue(v))
      } else if (val.mapValue !== undefined) {
        obj[key] = this.fromFirestoreFields(val.mapValue.fields)
      } else if (val.nullValue !== undefined) obj[key] = null
    }
    return obj
  }

   
  private fromFirestoreValue(val: any): any {
    if (val.stringValue !== undefined) return val.stringValue
    else if (val.integerValue !== undefined) return Number(val.integerValue)
    // ... recurse as needed. Keeping it simple for array values.
    if (val.mapValue) return this.fromFirestoreFields(val.mapValue.fields)
    return Object.values(val)[0]
  }

   
  private toFirestoreFields(obj: any, inArray = false): any {
     
    const fields: any = {}
    for (const key in obj) {
      const val = obj[key]
      fields[key] = this.toFirestoreValue(val, inArray)
    }
    return fields
  }

   
  private toFirestoreNumber(val: number): any {
    if (Number.isNaN(val)) return { doubleValue: 'NaN' }
    if (val === Infinity) return { doubleValue: 'Infinity' }
    if (val === -Infinity) return { doubleValue: '-Infinity' }
    if (Number.isInteger(val)) return { integerValue: String(val) }
    return { doubleValue: val }
  }

   
  private toFirestoreValue(val: any, inArray = false): any {
    if (val === null || val === undefined) return { nullValue: null }
    if (typeof val === 'string') return { stringValue: val }
    if (typeof val === 'number') {
      return this.toFirestoreNumber(val)
    }
    if (typeof val === 'boolean') return { booleanValue: val }
    if (Array.isArray(val)) {
      if (inArray) {
        // Firestore DOES NOT support nested arrays, even if separated by Map objects.
        // Array -> Map -> Array is FORBIDDEN.
        // Fallback: Stringify nested arrays to preserve data without crashing.
        return { stringValue: JSON.stringify(val) }
      }

       
      const values = val.map((v: any) => this.toFirestoreValue(v, true))
      return { arrayValue: { values } }
    }
    if (typeof val === 'object') {
      // Handle Date objects
      if (val instanceof Date) {
        return { timestampValue: val.toISOString() }
      }
      return { mapValue: { fields: this.toFirestoreFields(val, inArray) } }
    }
    return { stringValue: String(val) }
  }
}
