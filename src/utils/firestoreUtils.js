/**
 * Sanitizes data before sending to Firestore by removing undefined values
 * and converting empty strings to null for optional fields
 */
export function sanitizeForFirestore(data, optionalFields = []) {
  const sanitized = {}

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      // Skip undefined values entirely
      continue
    } else if (value === "" && optionalFields.includes(key)) {
      // Convert empty strings to null for optional fields
      sanitized[key] = null
    } else if (value === "") {
      // Keep empty strings for required fields
      sanitized[key] = value
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Validates that required fields are not empty
 */
export function validateRequiredFields(data, requiredFields) {
  const errors = {}

  for (const field of requiredFields) {
    if (!data[field] || data[field].trim() === "") {
      errors[field] = `${field} is required`
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Converts numeric strings to numbers, handling empty strings
 */
export function parseNumericField(value, defaultValue = 0) {
  if (value === "" || value === null || value === undefined) {
    return defaultValue
  }

  const parsed = Number(value)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Safely formats dates for Firestore
 */
export function formatDateForFirestore(dateString) {
  if (!dateString || dateString.trim() === "") {
    return null
  }

  try {
    return new Date(dateString)
  } catch (error) {
    console.warn("Invalid date format:", dateString)
    return null
  }
}
