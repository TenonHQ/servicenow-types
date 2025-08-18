# CLAUDE.md - ServiceNow TypeScript Types

This file provides guidance to Claude Code (claude.ai/code) when working with ServiceNow TypeScript type definitions in this directory.

## Directory Overview

This directory contains comprehensive TypeScript type definitions for ServiceNow's client and server-side APIs, providing type safety and IntelliSense support for ServiceNow development within the Tenon ecosystem.

**Package Name:** `@tenonhq/servicenow-types` (previously `@nuvolo/servicenow-types`)

## Directory Structure

### Core Type Packages

- **`client/`** - Client-side ServiceNow API types
  - Browser-based APIs (GlideAjax, GlideForm, GlideUser, etc.)
  - Service Portal utilities (spUtil, spModal, etc.)
  - Mobile APIs
  - Both standard and SNAPI-prefixed versions

- **`server/`** - Server-side ServiceNow API types
  - Core server APIs (GlideRecord, GlideSystem, GlideAggregate, etc.)
  - Scoped application namespaces (`sn_*` modules)
  - Global utilities and base classes
  - Both standard and SNAPI-prefixed versions

- **`util/`** - Utility types and helpers
  - `ReferenceGlideElement<T>` - Generic type for reference fields
  - `TypedRESTAPIRequest<T>` - Typed REST API request wrapper
  - `QueryOperator` - Valid query operators for GlideRecord
  - `FieldType<T>` - Field name extraction utility

- **`src/`** - Source files for type generation
  - TypeScript generators and utilities
  - Configuration objects
  - Server addons and common definitions

## Understanding Type Versions

### Standard vs SNAPI Types

ServiceNow provides two versions of most APIs:

1. **Standard Types** (e.g., `GlideRecord.d.ts`)
   - Enhanced with TypeScript generics for better type safety
   - Provides field-level type checking when table interfaces are defined
   - Recommended for new development with typed table interfaces

2. **SNAPI Types** (e.g., `SNAPIGlideRecord.d.ts`)
   - Direct mapping to ServiceNow's documented APIs
   - No generic enhancements (uses `any` types)
   - Base classes for the enhanced standard types
   - Use when working with legacy code or when table types aren't defined

### Example: GlideRecord with Generics

```typescript
import { GlideRecord, GlideElement } from '@tenonhq/servicenow-types/server';
import { ReferenceGlideElement } from '@tenonhq/servicenow-types/util';

// Define your table interface
interface IncidentTable {
  number: GlideElement;
  short_description: GlideElement;
  assigned_to: ReferenceGlideElement<UserTable>;
  priority: GlideElement;
  state: GlideElement;
}

interface UserTable {
  user_name: GlideElement;
  email: GlideElement;
  department: GlideElement;
}

// Use typed GlideRecord
const gr = new GlideRecord<IncidentTable>('incident');
gr.addQuery('priority', '=', '1'); // TypeScript validates field names
gr.query();

if (gr.next()) {
  // Field access is type-safe
  const description = gr.getValue('short_description'); // Returns string | null
  const assignedUser = gr.assigned_to.getRefRecord(); // Returns GlideRecord<UserTable>
}
```

## Scoped Application Namespaces

ServiceNow scoped applications have their own namespaces with specialized APIs:

### Available Scopes

- **`sn_auth/`** - OAuth authentication APIs
- **`sn_cc/`** - Connection and credentials management
- **`sn_clotho/`** - Data transformation framework
- **`sn_cmdb/`** - CMDB identification engine
- **`sn_cmdbgroup/`** - CMDB group management
- **`sn_connect/`** - Connect conversation APIs
- **`sn_discovery/`** - Discovery APIs
- **`sn_fd/`** - Flow Designer APIs
- **`sn_hw/`** - History walker utilities
- **`sn_impex/`** - Import/Export utilities
- **`sn_interaction/`** - Interaction management
- **`sn_nlp_sentiment/`** - Sentiment analysis
- **`sn_notification/`** - Notification messaging
- **`sn_notify/`** - Notify phone services
- **`sn_sc/`** - Service Catalog APIs
- **`sn_uc/`** - User criteria management
- **`sn_ws/`** - Web services (REST/SOAP)

### Using Scoped APIs

```typescript
// Import from specific scope
import { sn_ws } from '@tenonhq/servicenow-types/server';

// Use scoped REST APIs
const request = new sn_ws.RESTMessageV2('integration_name', 'get');
request.setEndpoint('https://api.example.com/data');
const response = request.execute();
```

## Integration with Tenon Development

### With Sincronia

When developing ServiceNow applications with Sincronia:

```typescript
// In your server scripts (Business Rules, Script Includes, etc.)
/// <reference types="@tenonhq/servicenow-types/server" />

// TypeScript will now provide IntelliSense for ServiceNow APIs
const gr = new GlideRecord('x_cadso_table');
gr.addQuery('active', true);
gr.query();
```

### With UI Components (Mortise/Sashimono)

```typescript
// In component actions or client scripts
import { GlideAjax } from '@tenonhq/servicenow-types/client';

const ajax = new GlideAjax('x_cadso_ajax_processor');
ajax.addParam('sysparm_name', 'getData');
ajax.getXMLAnswer((response) => {
  // Handle response
});
```

### With ServiceNow Stories Application

```typescript
// When working with rm_story table
interface StoryTable {
  number: GlideElement;
  short_description: GlideElement;
  state: GlideElement;
  assigned_to: ReferenceGlideElement<UserTable>;
  claude_context: GlideElement;
}

const storyGR = new GlideRecord<StoryTable>('rm_story');
storyGR.get('STORY0001234');
```

## Common Usage Patterns

### Type-Safe Query Building

```typescript
import { GlideRecord } from '@tenonhq/servicenow-types/server';
import { QueryOperator } from '@tenonhq/servicenow-types/util';

const operators: QueryOperator[] = ['=', '!=', 'IN', 'CONTAINS'];
gr.addQuery('field_name', operators[0], 'value');
```

### Reference Field Navigation

```typescript
interface TaskTable {
  assigned_to: ReferenceGlideElement<UserTable>;
}

const task = new GlideRecord<TaskTable>('task');
if (task.get('sys_id')) {
  const user = task.assigned_to.getRefRecord();
  const email = user.getValue('email');
}
```

### REST API Type Safety

```typescript
import { TypedRESTAPIRequest } from '@tenonhq/servicenow-types/util';

interface MyRequestBody {
  action: string;
  data: {
    id: string;
    value: number;
  };
}

// In Scripted REST API
(function process(request: TypedRESTAPIRequest<MyRequestBody>, response) {
  const { action, data } = request.body.data;
  // TypeScript knows the structure of your request
})(request, response);
```

## File Naming Conventions

- **Standard types:** `[APIName].d.ts` (e.g., `GlideRecord.d.ts`)
- **SNAPI types:** `SNAPI[APIName].d.ts` (e.g., `SNAPIGlideRecord.d.ts`)
- **Scoped types:** `[scope]_[APIName].d.ts` (e.g., `sn_ws_RESTMessageV2.d.ts`)
- **Scoped SNAPI:** `[scope]_SNAPI[APIName].d.ts` (e.g., `sn_ws_SNAPIRESTMessageV2.d.ts`)

## Development Commands

### Installation

```bash
# Install as dev dependency in your project
npm install -D @tenonhq/servicenow-types
```

### TypeScript Configuration

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@tenonhq/servicenow-types"]
  }
}
```

### Triple-Slash Directives

For non-module scripts:

```typescript
/// <reference types="@tenonhq/servicenow-types/server" />
/// <reference types="@tenonhq/servicenow-types/client" />
```

## Important Notes

### Version Compatibility

- Types are generated from ServiceNow documentation
- May not include all undocumented APIs
- Version in `package.json` follows Tenon's versioning scheme
- Compatible with ServiceNow New York release and later

### Type Limitations

1. **Dynamic Fields:** ServiceNow allows dynamic field access that TypeScript cannot fully type
2. **Dot-Walking:** Complex reference chains may lose type information
3. **Scoped APIs:** Some scoped application APIs may not be fully typed
4. **Custom Tables:** You must define interfaces for your custom tables

### Best Practices

1. **Define Table Interfaces:** Create interfaces for all custom tables (x_cadso_*)
2. **Use Generic Types:** Leverage `GlideRecord<T>` for type safety
3. **Avoid `any` Types:** Use SNAPI types only when necessary
4. **Document Custom Types:** Add JSDoc comments to your table interfaces
5. **Centralize Type Definitions:** Keep table interfaces in a shared location

## Relationship to Tenon Ecosystem

### ServiceNow Folder Integration

These types are used throughout the `/ServiceNow/` folder for:
- Business Rules
- Script Includes
- Scripted REST APIs
- Background Scripts
- UI Scripts

### Component Development

Used in Mortise and Sashimono components for:
- Server-side data fetching
- Client-side API calls
- Event handling
- State management

### Sincronia Development

Essential for TypeScript support when using Sincronia for:
- Local development with type checking
- IntelliSense in VS Code
- Compile-time error detection
- Refactoring support

## Troubleshooting

### Common Issues

1. **Missing Types:** If a ServiceNow API isn't typed, check SNAPI versions or create a custom declaration
2. **Version Conflicts:** Ensure only one version of the types package is installed
3. **Import Errors:** Use the correct import path (`/server`, `/client`, or `/util`)
4. **Generic Constraints:** Table interfaces must extend correct base types

### Getting Help

- Check existing type definitions in the respective folders
- Reference ServiceNow documentation for API details
- Consult the main CLAUDE.md for overall project structure
- Use SNAPI types as fallback for untyped APIs

## File Generation

The types in this directory are generated from ServiceNow's official documentation. The `src/` folder contains the generation scripts, but manual modifications should be avoided as they will be overwritten on the next generation cycle.