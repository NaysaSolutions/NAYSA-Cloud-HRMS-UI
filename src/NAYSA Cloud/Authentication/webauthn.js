function binaryStringToUint8Array(binary) {
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeBinaryMime(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  const match = trimmed.match(/^=\?BINARY\?B\?(.+)\?=$/i);

  if (!match) return null;

  const base64 = match[1];
  const binary = window.atob(base64);
  return binaryStringToUint8Array(binary);
}

function base64ToUint8Array(base64) {
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = window.atob(padded);
  return binaryStringToUint8Array(binary);
}

function base64UrlToUint8Array(value, fieldName = "unknown") {
  if (value == null) {
    throw new Error(`Missing value for ${fieldName}.`);
  }

  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (Array.isArray(value)) {
    return new Uint8Array(value);
  }

  if (typeof value !== "string") {
    console.error(`Unsupported value type for ${fieldName}:`, value);
    throw new Error(`Unsupported value type for ${fieldName}.`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`Empty value for ${fieldName}.`);
  }

  const binaryMime = decodeBinaryMime(trimmed);
  if (binaryMime) {
    return binaryMime;
  }

  try {
    const normalized = trimmed.replace(/-/g, "+").replace(/_/g, "/");
    return base64ToUint8Array(normalized);
  } catch (err1) {
    try {
      return base64ToUint8Array(trimmed);
    } catch (err2) {
      console.error(`Failed decoding ${fieldName}`, {
        value: trimmed,
        err1,
        err2,
      });
      throw err2;
    }
  }
}

function arrayBufferToBase64Url(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";

  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }

  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function prepareRegisterPublicKey(input) {
  const options = input?.publicKey ?? input;

  if (!options) {
    throw new Error("Missing registration options.");
  }

  console.log("prepareRegisterPublicKey raw options:", options);
  console.log("challenge raw:", options?.challenge);
  console.log("user.id raw:", options?.user?.id);
  console.log("excludeCredentials raw:", options?.excludeCredentials);

  return {
    ...options,
    challenge: base64UrlToUint8Array(options.challenge, "challenge"),
    user: {
      ...options.user,
      id: base64UrlToUint8Array(options?.user?.id, "user.id"),
    },
    excludeCredentials: Array.isArray(options.excludeCredentials)
      ? options.excludeCredentials.map((cred, index) => ({
          ...cred,
          id: base64UrlToUint8Array(
            cred?.id,
            `excludeCredentials[${index}].id`
          ),
        }))
      : [],
  };
}

export function prepareLoginPublicKey(input) {
  const options = input?.publicKey ?? input;

  if (!options) {
    throw new Error("Missing login options.");
  }

  console.log("prepareLoginPublicKey raw options:", options);
  console.log("challenge raw:", options?.challenge);
  console.log("allowCredentials raw:", options?.allowCredentials);

  return {
    ...options,
    challenge: base64UrlToUint8Array(options.challenge, "challenge"),
    allowCredentials: Array.isArray(options.allowCredentials)
      ? options.allowCredentials.map((cred, index) => ({
          ...cred,
          id: base64UrlToUint8Array(
            cred?.id,
            `allowCredentials[${index}].id`
          ),
        }))
      : [],
  };
}

export function serializeRegisterCredential(credential) {
  if (!credential) {
    throw new Error("Missing registration credential.");
  }

  return {
    id: credential.id,
    type: credential.type,
    rawId: arrayBufferToBase64Url(credential.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64Url(
        credential.response.clientDataJSON
      ),
      attestationObject: arrayBufferToBase64Url(
        credential.response.attestationObject
      ),
    },
  };
}

export function serializeLoginCredential(credential) {
  if (!credential) {
    throw new Error("Missing login credential.");
  }

  return {
    id: credential.id,
    type: credential.type,
    rawId: arrayBufferToBase64Url(credential.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64Url(
        credential.response.clientDataJSON
      ),
      authenticatorData: arrayBufferToBase64Url(
        credential.response.authenticatorData
      ),
      signature: arrayBufferToBase64Url(credential.response.signature),
      userHandle: credential.response.userHandle
        ? arrayBufferToBase64Url(credential.response.userHandle)
        : null,
    },
  };
}