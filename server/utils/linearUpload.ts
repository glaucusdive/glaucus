/**
 * Upload bytes to Linear storage via fileUpload + PUT (server-side only).
 * @see https://linear.app/developers/how-to-upload-a-file-to-linear
 */

const LINEAR_GRAPHQL_URL = 'https://api.linear.app/graphql'

const FILE_UPLOAD_MUTATION = `
mutation FileUpload($contentType: String!, $filename: String!, $size: Int!) {
  fileUpload(contentType: $contentType, filename: $filename, size: $size) {
    success
    uploadFile {
      uploadUrl
      assetUrl
      headers {
        key
        value
      }
    }
  }
}
`

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message?: string }>
}

async function linearGraphQL<T> (
  apiKey: string,
  query: string,
  variables: Record<string, unknown>
): Promise<{ ok: boolean; json: GraphQLResponse<T> | null }> {
  const res = await fetch(LINEAR_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey
    },
    body: JSON.stringify({ query, variables })
  })
  const json = (await res.json().catch(() => null)) as GraphQLResponse<T> | null
  return { ok: res.ok, json }
}

type UploadFilePayload = {
  fileUpload?: {
    success?: boolean
    uploadFile?: {
      uploadUrl: string
      assetUrl: string
      headers: Array<{ key?: string; name?: string; value?: string }>
    } | null
  }
}

/** @returns Linear asset URL for use in issue markdown */
export async function uploadBufferToLinear (params: {
  apiKey: string
  buffer: Buffer
  filename: string
  contentType: string
}): Promise<string> {
  const { apiKey, buffer, filename, contentType } = params
  const size = buffer.byteLength

  const { ok, json } = await linearGraphQL<UploadFilePayload>(apiKey, FILE_UPLOAD_MUTATION, {
    contentType,
    filename: filename.slice(0, 255),
    size: Math.min(Math.floor(size), 2_147_483_647)
  })

  if (!ok || !json) {
    throw new Error('Linear fileUpload: HTTP failure')
  }
  if (Array.isArray(json.errors) && json.errors.length > 0) {
    throw new Error(`Linear fileUpload: ${json.errors.map(e => e?.message).join('; ')}`)
  }

  const payload = json.data?.fileUpload
  if (!payload?.success || !payload.uploadFile?.uploadUrl || !payload.uploadFile?.assetUrl) {
    throw new Error('Linear fileUpload: no upload URL returned')
  }

  const { uploadUrl, assetUrl, headers: hdrs } = payload.uploadFile

  const putHeaders = new Headers()
  putHeaders.set('Content-Type', contentType)
  putHeaders.set('Cache-Control', 'public, max-age=31536000')
  for (const h of hdrs ?? []) {
    const k = h.key ?? h.name
    const v = h.value
    if (k && v) putHeaders.set(k, v)
  }

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: putHeaders,
    body: buffer
  })

  if (!putRes.ok) {
    const errText = await putRes.text().catch(() => '')
    throw new Error(`Linear storage PUT failed: ${putRes.status} ${errText.slice(0, 200)}`)
  }

  return assetUrl
}
