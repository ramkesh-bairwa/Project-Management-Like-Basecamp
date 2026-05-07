# Image Upload Implementation for Projects, Groups, and Tasks

## Summary
Added image upload functionality for projects, groups, and tasks throughout the application.

## Database Changes

### Migration File
- **File**: `database/migrations/add_images_to_entities.sql`
- Added `image` column to `projects`, `groups`, and `tasks` tables

### SQL Commands
```sql
ALTER TABLE projects ADD COLUMN image VARCHAR(500) AFTER description;
ALTER TABLE groups ADD COLUMN image VARCHAR(500) AFTER avatar;
ALTER TABLE tasks ADD COLUMN image VARCHAR(500) AFTER description;
```

## API Routes Created

### 1. Project Image Upload
- **Endpoint**: `/api/projects/image`
- **Method**: POST
- **File**: `src/app/api/projects/image/route.ts`
- **Upload Directory**: `public/uploads/projects/`
- **Filename Pattern**: `project_{timestamp}.{ext}`

### 2. Group Image Upload
- **Endpoint**: `/api/groups/image`
- **Method**: POST
- **File**: `src/app/api/groups/image/route.ts`
- **Upload Directory**: `public/uploads/groups/`
- **Filename Pattern**: `group_{timestamp}.{ext}`

### 3. Task Image Upload
- **Endpoint**: `/api/tasks/image`
- **Method**: POST
- **File**: `src/app/api/tasks/image/route.ts`
- **Upload Directory**: `public/uploads/tasks/`
- **Filename Pattern**: `task_{timestamp}.{ext}`

## API Route Updates

### Projects API (`src/app/api/projects/route.ts`)
- **POST**: Added `image` field to project creation
- **GET**: Returns `image` field with project data

### Groups API (`src/app/api/groups/route.ts`)
- **POST**: Added `image` field to group creation
- **GET**: Returns `image` field with group data

### Tasks API (`src/app/api/tasks/route.ts`)
- **POST**: Added `image` field to task creation
- **PUT**: Added `image` field to task updates
- **GET**: Returns `image` field with task data

## Frontend Updates

### Projects Page (`src/app/(dashboard)/projects/page.tsx`)
- Added image upload state management
- Added file input ref
- Added `handleImageChange` function for image upload
- Added image preview in create project form
- Shows uploaded/preview image before form submission

### Groups Page (`src/app/(dashboard)/groups/page.tsx`)
- Added image upload state management
- Added file input ref
- Added `handleImageChange` function for image upload
- Added image preview in create group form
- Shows uploaded/preview image before form submission

### Tasks Page
- Tasks already have attachment functionality via `/api/documents/upload`
- Supports images, videos, and links
- Includes paste and drag-drop functionality

## Features

### Image Upload UI
- Hidden file input with custom button trigger
- Real-time preview of selected image
- Upload progress indicator
- Supports: JPG, PNG, WebP, GIF
- 20x20 rounded preview thumbnail
- Dashed border upload button with icon

### Upload Flow
1. User clicks "📷 Choose Image" button
2. File picker opens
3. User selects image
4. Image immediately uploads to server
5. Preview shows while uploading
6. URL stored in form state
7. Submitted with form data

## File Structure
```
public/uploads/
├── avatars/      (existing - user avatars)
├── documents/    (existing - task attachments)
├── projects/     (new - project images)
├── groups/       (new - group images)
└── tasks/        (new - task images)
```

## Usage

### To Run Migration
```bash
mysql -u root -p project_management < database/migrations/add_images_to_entities.sql
```

### Creating Project with Image
1. Navigate to Projects page
2. Click "+ New Project"
3. Fill in project details
4. Click "📷 Choose Image"
5. Select image file
6. Wait for upload (shows "Uploading…")
7. Preview appears
8. Click "Create Project"

### Creating Group with Image
1. Navigate to Groups page
2. Click "+ New Group"
3. Fill in group details
4. Click "📷 Choose Image"
5. Select image file
6. Wait for upload
7. Preview appears
8. Click "Create Group"

### Creating Task with Image
Tasks use the existing attachment system which supports:
- Image upload via button
- Video upload via button
- Paste images with Ctrl+V
- Drag and drop files
- Add links to external media

## TypeScript Interfaces Updated

```typescript
// Projects
interface Project {
  // ... existing fields
  image: string | null;
}

// Groups
interface Group {
  // ... existing fields
  image: string | null;
}

// Tasks - already supported via attachments
```

## Security
- File type validation (only images allowed)
- Authenticated endpoints (requires Bearer token)
- Unique filenames prevent collisions
- Files stored outside source code directory
