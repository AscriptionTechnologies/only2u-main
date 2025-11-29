# Referral Code API Integration Examples

## Overview
This document provides code examples for integrating the referral code system into your mobile app or website.

## Table of Contents
- [JavaScript/React Examples](#javascriptreact-examples)
- [React Native Examples](#react-native-examples)
- [API Endpoints](#api-endpoints)
- [Error Handling](#error-handling)

---

## JavaScript/React Examples

### 1. Validate Referral Code

```javascript
import { supabase } from './supabaseClient';

async function validateReferralCode(code) {
  try {
    const { data, error } = await supabase
      .rpc('validate_referral_code', { p_code: code });
    
    if (error) throw error;
    
    const result = data[0];
    return {
      isValid: result.is_valid,
      message: result.message,
      referralCodeId: result.referral_code_id
    };
  } catch (error) {
    console.error('Error validating referral code:', error);
    return {
      isValid: false,
      message: 'Unable to validate referral code. Please try again.',
      referralCodeId: null
    };
  }
}

// Usage
const validation = await validateReferralCode('K7N3R2M4');
if (validation.isValid) {
  console.log('Valid code!');
  // Proceed with signup
} else {
  alert(validation.message);
}
```

### 2. Complete Signup with Referral

```javascript
async function signupWithReferral(userData, referralCode) {
  try {
    // Step 1: Validate referral code
    const validation = await validateReferralCode(referralCode);
    
    if (!validation.isValid) {
      throw new Error(validation.message);
    }
    
    // Step 2: Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          phone: userData.phone
        }
      }
    });
    
    if (authError) throw authError;
    
    // Step 3: Record referral usage
    const { error: usageError } = await supabase
      .from('referral_code_usage')
      .insert({
        referral_code_id: validation.referralCodeId,
        referral_code: referralCode,
        user_id: authData.user.id,
        user_email: userData.email,
        user_phone: userData.phone,
        user_name: userData.name,
        metadata: {
          signup_source: 'web',
          user_agent: navigator.userAgent
        }
      });
    
    if (usageError) {
      console.error('Failed to record referral usage:', usageError);
      // Note: Don't block signup if this fails
    }
    
    return {
      success: true,
      user: authData.user,
      message: 'Account created successfully!'
    };
    
  } catch (error) {
    return {
      success: false,
      user: null,
      message: error.message
    };
  }
}

// Usage
const result = await signupWithReferral({
  email: 'user@example.com',
  password: 'securePassword123',
  name: 'John Doe',
  phone: '+1234567890'
}, 'K7N3R2M4');

if (result.success) {
  console.log('Signup successful!');
} else {
  alert(result.message);
}
```

### 3. React Component Example

```jsx
import React, { useState } from 'react';
import { supabase } from './supabaseClient';

function SignupForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    referralCode: ''
  });
  
  const [referralStatus, setReferralStatus] = useState({
    validated: false,
    isValid: false,
    message: ''
  });
  
  const [loading, setLoading] = useState(false);
  
  // Validate referral code as user types (with debounce)
  const handleReferralCodeChange = async (code) => {
    setFormData({ ...formData, referralCode: code });
    
    if (code.length === 8) {
      const validation = await validateReferralCode(code);
      setReferralStatus({
        validated: true,
        isValid: validation.isValid,
        message: validation.message
      });
    } else {
      setReferralStatus({ validated: false, isValid: false, message: '' });
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // If referral code provided, validate it first
    if (formData.referralCode) {
      if (!referralStatus.isValid) {
        alert('Please enter a valid referral code or leave it empty');
        setLoading(false);
        return;
      }
      
      const result = await signupWithReferral(formData, formData.referralCode);
      
      if (result.success) {
        alert('Account created with referral code!');
        // Redirect to dashboard
      } else {
        alert(result.message);
      }
    } else {
      // Signup without referral
      // ... normal signup logic
    }
    
    setLoading(false);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        placeholder="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      
      <input
        type="tel"
        placeholder="Phone"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        required
      />
      
      <input
        type="password"
        placeholder="Password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
      />
      
      <div>
        <input
          type="text"
          placeholder="Referral Code (Optional)"
          value={formData.referralCode}
          onChange={(e) => handleReferralCodeChange(e.target.value.toUpperCase())}
          maxLength={8}
          className={
            referralStatus.validated
              ? referralStatus.isValid
                ? 'border-green-500'
                : 'border-red-500'
              : ''
          }
        />
        {referralStatus.validated && (
          <p className={referralStatus.isValid ? 'text-green-600' : 'text-red-600'}>
            {referralStatus.message}
          </p>
        )}
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creating Account...' : 'Sign Up'}
      </button>
    </form>
  );
}

export default SignupForm;
```

---

## React Native Examples

### 1. Validate Referral Code (React Native)

```javascript
import { supabase } from './supabaseClient';
import { Alert } from 'react-native';

async function validateReferralCode(code) {
  try {
    const { data, error } = await supabase
      .rpc('validate_referral_code', { p_code: code });
    
    if (error) throw error;
    
    const result = data[0];
    return {
      isValid: result.is_valid,
      message: result.message,
      referralCodeId: result.referral_code_id
    };
  } catch (error) {
    console.error('Error validating referral code:', error);
    return {
      isValid: false,
      message: 'Unable to validate referral code. Please try again.',
      referralCodeId: null
    };
  }
}
```

### 2. Record Referral Usage (React Native)

```javascript
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info'; // npm install react-native-device-info

async function recordReferralUsage(referralCodeId, referralCode, userData) {
  try {
    const { error } = await supabase
      .from('referral_code_usage')
      .insert({
        referral_code_id: referralCodeId,
        referral_code: referralCode,
        user_id: userData.userId,
        user_email: userData.email,
        user_phone: userData.phone,
        user_name: userData.name,
        metadata: {
          signup_source: 'mobile_app',
          platform: Platform.OS, // 'ios' or 'android'
          device_model: await DeviceInfo.getModel(),
          app_version: await DeviceInfo.getVersion()
        }
      });
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Failed to record referral usage:', error);
    // Don't throw - signup should still succeed
    return { success: false, error };
  }
}
```

### 3. Complete React Native Signup Component

```jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { supabase } from './supabaseClient';

function SignupScreen({ navigation }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    referralCode: ''
  });
  
  const [referralValidation, setReferralValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  
  // Auto-validate referral code when it's 8 characters
  useEffect(() => {
    if (formData.referralCode.length === 8) {
      validateCode();
    } else {
      setReferralValidation(null);
    }
  }, [formData.referralCode]);
  
  const validateCode = async () => {
    setValidating(true);
    const result = await validateReferralCode(formData.referralCode);
    setReferralValidation(result);
    setValidating(false);
  };
  
  const handleSignup = async () => {
    // Validate inputs
    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    // If referral code provided, ensure it's valid
    if (formData.referralCode && !referralValidation?.isValid) {
      Alert.alert('Invalid Referral Code', 'Please enter a valid referral code or leave it empty');
      return;
    }
    
    setLoading(true);
    
    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone
          }
        }
      });
      
      if (authError) throw authError;
      
      // If referral code was used, record it
      if (formData.referralCode && referralValidation?.isValid) {
        await recordReferralUsage(
          referralValidation.referralCodeId,
          formData.referralCode,
          {
            userId: authData.user.id,
            email: formData.email,
            phone: formData.phone,
            name: formData.name
          }
        );
      }
      
      Alert.alert(
        'Success!',
        'Your account has been created successfully.',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
      
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={formData.name}
        onChangeText={(text) => setFormData({ ...formData, name: text })}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={formData.email}
        onChangeText={(text) => setFormData({ ...formData, email: text })}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Phone"
        value={formData.phone}
        onChangeText={(text) => setFormData({ ...formData, phone: text })}
        keyboardType="phone-pad"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={formData.password}
        onChangeText={(text) => setFormData({ ...formData, password: text })}
        secureTextEntry
      />
      
      <View>
        <TextInput
          style={[
            styles.input,
            referralValidation?.isValid && styles.inputValid,
            referralValidation && !referralValidation.isValid && styles.inputInvalid
          ]}
          placeholder="Referral Code (Optional)"
          value={formData.referralCode}
          onChangeText={(text) => setFormData({ ...formData, referralCode: text.toUpperCase() })}
          maxLength={8}
          autoCapitalize="characters"
        />
        
        {validating && <ActivityIndicator size="small" />}
        
        {referralValidation && (
          <Text style={referralValidation.isValid ? styles.validText : styles.invalidText}>
            {referralValidation.message}
          </Text>
        )}
      </View>
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.linkText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16
  },
  inputValid: {
    borderColor: '#10b981'
  },
  inputInvalid: {
    borderColor: '#ef4444'
  },
  validText: {
    color: '#10b981',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12
  },
  invalidText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12
  },
  button: {
    backgroundColor: '#F53F7A',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  linkText: {
    color: '#F53F7A',
    textAlign: 'center',
    marginTop: 16
  }
});

export default SignupScreen;
```

---

## API Endpoints

### Supabase RPC Function

```sql
-- Already created by migration
-- Call: supabase.rpc('validate_referral_code', { p_code: 'CODE123' })
```

**Returns:**
```json
[{
  "is_valid": true,
  "message": "Referral code is valid",
  "referral_code_id": "uuid-here"
}]
```

### Direct Table Insert

```javascript
// Insert usage record
await supabase
  .from('referral_code_usage')
  .insert({
    referral_code_id: 'uuid-here',
    referral_code: 'CODE123',
    user_email: 'user@example.com',
    user_phone: '+1234567890',
    user_name: 'John Doe'
  });
```

---

## Error Handling

### Best Practices

```javascript
async function safeReferralSignup(userData, referralCode) {
  let validationResult = null;
  
  try {
    // Validate code
    if (referralCode) {
      validationResult = await validateReferralCode(referralCode);
      
      if (!validationResult.isValid) {
        return {
          success: false,
          error: validationResult.message,
          stage: 'validation'
        };
      }
    }
    
    // Create user
    const authResult = await createUserAccount(userData);
    
    if (!authResult.success) {
      return {
        success: false,
        error: authResult.error,
        stage: 'account_creation'
      };
    }
    
    // Record referral (non-blocking)
    if (referralCode && validationResult) {
      recordReferralUsage(
        validationResult.referralCodeId,
        referralCode,
        userData
      ).catch(err => {
        // Log but don't block
        console.error('Referral recording failed:', err);
      });
    }
    
    return {
      success: true,
      user: authResult.user,
      stage: 'complete'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stage: 'unknown'
    };
  }
}
```

### Common Error Scenarios

```javascript
// Handle all possible error cases
const result = await safeReferralSignup(userData, referralCode);

if (!result.success) {
  switch (result.stage) {
    case 'validation':
      alert('Invalid referral code. Please check and try again.');
      break;
    case 'account_creation':
      alert('Unable to create account. Please try again later.');
      break;
    default:
      alert('An unexpected error occurred. Please try again.');
  }
} else {
  // Success!
  console.log('User created:', result.user);
}
```

---

## Testing

### Test Valid Code

```javascript
// Test with a real code from your admin panel
const testCode = 'K7N3R2M4'; // Replace with actual code
const result = await validateReferralCode(testCode);
console.log('Validation result:', result);
```

### Test Invalid Code

```javascript
const result = await validateReferralCode('INVALID1');
// Should return: { isValid: false, message: 'Referral code not found', referralCodeId: null }
```

### Test Usage Recording

```javascript
await recordReferralUsage(
  'valid-uuid-here',
  'TESTCODE',
  {
    userId: 'test-user-id',
    email: 'test@example.com',
    phone: '+1234567890',
    name: 'Test User'
  }
);
```

---

## Security Notes

1. **Always validate on server-side** - Never trust client-side validation alone
2. **Use HTTPS** - Ensure all API calls are over secure connections
3. **Rate limiting** - Consider adding rate limits to prevent abuse
4. **Sanitize inputs** - Always sanitize user inputs before database operations
5. **Error messages** - Don't expose sensitive information in error messages

---

## Support

For more information, see:
- `REFERRAL_CODE_SYSTEM.md` - Complete system documentation
- `REFERRAL_QUICK_START.md` - Quick setup guide
- Supabase documentation: https://supabase.com/docs

