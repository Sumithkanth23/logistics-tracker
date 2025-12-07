# Firebase Security and Data Separation

## Overview
This application implements proper user-to-user data separation using Firebase Firestore and Realtime Database security rules.

## Data Structure

### Firestore Collections

#### 1. `users/{userId}/vehicles/{vehicleKey}`
- **Purpose**: User's private vehicle collection
- **Access**: Only the owner (userId) can read/write
- **Contains**: Vehicle metadata including label, description, driverId, timestamps

#### 2. `users/{userId}/drivers/{driverId}`
- **Purpose**: User's driver assignments
- **Access**: Only the owner (userId) can read/write
- **Contains**: Driver-to-vehicle mappings

#### 3. `vehicles/{vehicleKey}` (Global)
- **Purpose**: Global vehicle metadata
- **Access**: 
  - **Read**: Owner OR users who have this vehicle in their `users/{uid}/vehicles` collection
  - **Write**: Owner only (cannot change owner field after creation)
- **Contains**: label, desc, owner, driverId, timestamps

### Realtime Database Paths

#### 1. `users/{userId}/vehicles/{vehicleKey}`
- **Purpose**: User's vehicle mappings
- **Access**: Only the owner can read/write
- **Value**: `true` or metadata object

#### 2. `users/{userId}/drivers/{driverId}`
- **Purpose**: User's driver assignments
- **Access**: Only the owner can read/write
- **Value**: `{ vehicle: vehicleKey, assignedAt: timestamp }`

#### 3. `vehicles/{vehicleKey}`
- **Purpose**: Vehicle metadata and location data
- **Access**:
  - **Read**: Owner OR users with mapping in `users/{uid}/vehicles/{vehicleKey}`
  - **Write**: Owner OR users with mapping
- **Contains**: Live location data, metadata

#### 4. `busLocation/{vehicleKey}`
- **Purpose**: Alternative location storage path
- **Access**: Same as `vehicles/{vehicleKey}`
- **Contains**: Live GPS coordinates

## Security Rules

### Firestore Rules (`firestore.rules`)
```
- Users can only access their own /users/{userId} documents
- Vehicle reads require ownership OR assignment
- Vehicle writes require ownership
- Owner field cannot be changed after creation
```

### Realtime Database Rules (`database.rules.json`)
```
- User paths strictly enforce userId === auth.uid
- Vehicle paths check ownership via:
  1. users/{uid}/vehicles/{key} mapping exists, OR
  2. vehicles/{key}/owner === auth.uid
```

## Application-Level Validation

### Frontend Validation

#### `user/js/vehicle.js`
- Validates ownership before driver assignment
- Validates ownership before driver removal
- Blocks operations on vehicles not owned by current user

#### `user/js/home.js`
- Validates ownership in `assignDriver()` function
- Checks vehicle owner matches current user before modifications
- Only loads vehicles from user's private collection

#### `user/js/tracking.js`
- Loads only vehicles owned by current user via Firestore query:
  ```javascript
  fsQuery(collection(dbFs, 'vehicles'), fsWhere('owner', '==', uid))
  ```

#### `user/js/create_vehicle.js`
- Sets `owner` field to current user's UID on creation
- Writes to both user's private collection and global vehicles
- Creates user-vehicle mapping in RTDB

#### `driver/login.js`
- Validates driver ID matches assigned driver for vehicle
- Prevents drivers from accessing vehicles not assigned to them

## Data Flow

### Creating a Vehicle
1. User creates vehicle via `create_vehicle.html`
2. Write to `users/{uid}/vehicles/{key}` (private)
3. Write to `vehicles/{key}` with `owner: uid` (global)
4. Write to RTDB `users/{uid}/vehicles/{key}: true` (mapping)

### Assigning a Driver
1. User assigns driver via dashboard or vehicle page
2. Validate: current user is vehicle owner
3. Update `vehicles/{key}` with `driverId`
4. Update `users/{uid}/vehicles/{key}` with `driverId`
5. Create `users/{uid}/drivers/{driverId}` mapping

### Driver Login
1. Driver enters driver ID + vehicle ID
2. Validate: vehicle exists
3. Validate: vehicle has assigned driver
4. Validate: driver ID matches assigned driver ID
5. Allow access only if all validations pass

### Tracking Vehicles
1. User views tracking page
2. Load only vehicles where `owner == currentUid` via Firestore query
3. Watch RTDB location updates for owned vehicles only
4. Fallback to Firestore metadata if RTDB permission denied

## Deployment

### Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Deploy Realtime Database Rules
```bash
firebase deploy --only database
```

### Verify Security
1. Test with multiple user accounts
2. Attempt to access other users' vehicles (should fail)
3. Check Firebase console audit logs
4. Use Firebase Emulator for local testing:
   ```bash
   firebase emulators:start
   ```

## Best Practices

1. **Always validate ownership** before write operations
2. **Use user-scoped queries** to load data (never load all vehicles)
3. **Set owner field** on vehicle creation and never allow changes
4. **Use security rules** as primary defense (app-level is secondary)
5. **Test with multiple accounts** to ensure proper isolation
6. **Never expose other users' data** in API responses or queries

## Common Issues

### "Permission Denied" Errors
- Ensure user is authenticated (`auth.uid` exists)
- Verify user owns the vehicle (`vehicles/{key}/owner == auth.uid`)
- Check `users/{uid}/vehicles/{key}` mapping exists in RTDB

### Data Leakage
- Never query `collection('vehicles')` without filtering by owner
- Always use `where('owner', '==', uid)` in Firestore queries
- Never expose vehicle keys/IDs to non-owners

### Driver Access
- Drivers access vehicles via driver ID validation, not ownership
- Driver login validates `vehicles/{key}/driverId` matches entered ID
- Drivers cannot modify vehicle metadata, only send location updates
