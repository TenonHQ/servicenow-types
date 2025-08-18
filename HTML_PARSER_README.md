# ServiceNow TypeScript Generator - HTML Parser

## Overview

This update adds HTML parsing capability to the ServiceNow TypeScript Generator, allowing it to parse the new HTML-based documentation structure at developer.servicenow.com. The parser can work alongside the existing JSON parser with a simple configuration toggle.

## Changes Made

### 1. New Files
- **`src/HTMLParser.ts`** - Core HTML parsing module with the following functions:
  - `fetchHTMLPage()` - Fetches HTML with authentication headers
  - `parseNavigationHTML()` - Extracts API class list from sidebar navigation
  - `parseClassHTML()` - Parses individual class documentation pages
  - `parseMethodGroup()` - Extracts method signatures and details
  - `parsePropertyGroup()` - Extracts property definitions
  - `parseParametersTable()` - Parses method parameter tables
  - `parseReturnTable()` - Parses return type information
  - `normalizeType()` - Converts ServiceNow types to TypeScript types
  - `getHTMLAPIHierarchy()` - Main orchestration function

### 2. Updated Files

#### `src/common.d.ts`
- Added `useHTML?: boolean` flag to `HierarchyOpts` interface
- Added `HTMLParseOpts` interface for HTML-specific configuration

#### `src/SNClient.ts`
- Updated `getRootConfig()` to support HTML mode
- Modified `getClassInfo()` to accept `useHTML` parameter
- Updated `getAPIHierarchy()` to delegate to HTML parser when enabled
- Added imports for HTML parser functions

#### `src/index.ts`
- Added `USE_HTML_PARSER` environment variable check
- Updated configurations to include `useHTML` flag
- Enhanced logging to show parser mode
- Added error handling and validation

#### `.env`
- Added HTML parser configuration variables

#### `package.json`
- Added `cheerio` (1.0.0-rc.12) for HTML parsing
- Added `@types/cheerio` for TypeScript support

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# HTML Parser Configuration
USE_HTML_PARSER=true          # Set to 'true' for HTML mode, 'false' for JSON mode
HTML_PARSE_DELAY_MS=500        # Delay between requests in milliseconds
HTML_CACHE_ENABLED=true        # Enable HTML response caching
HTML_CACHE_TTL_MINUTES=5       # Cache time-to-live in minutes
MAX_RETRY_ATTEMPTS=3           # Number of retry attempts for failed requests
CONCURRENT_REQUESTS=5          # Maximum concurrent requests (not yet implemented)
```

## Usage

### Running with HTML Parser

1. Set `USE_HTML_PARSER=true` in your `.env` file
2. Compile TypeScript: `npx tsc`
3. Run the generator: `node dist/index.js`

### Running with JSON Parser (Legacy)

1. Set `USE_HTML_PARSER=false` in your `.env` file
2. Compile TypeScript: `npx tsc`
3. Run the generator: `node dist/index.js`

## Features

### 1. Backward Compatibility
- All existing JSON parsing code remains intact
- Feature flag (`USE_HTML_PARSER`) controls parser mode
- Generated TypeScript maintains the same structure
- No breaking changes to existing type definitions

### 2. Error Handling
- Retry logic with exponential backoff for failed requests
- Graceful fallback on parse errors
- Comprehensive error logging
- Clear authentication failure messages

### 3. Performance Optimization
- HTML response caching (5-minute default TTL)
- Rate limiting (500ms between requests)
- Progress indicators during generation
- Memory-efficient parsing

### 4. Type Normalization
- Automatic type conversion (ServiceNow → TypeScript)
- Handles method overloads
- Detects optional parameters
- Maps complex types correctly

## HTML Structure Parsed

The parser handles the following HTML elements:

```html
<!-- Navigation Links -->
<a class="dps-sidebar-nav-group-label">ClassName</a>

<!-- Method Groups -->
<div class="api-content-method-group">
  <h3>methodName(param1, param2)</h3>
  <table class="api-table">...</table>
</div>

<!-- Property Sections -->
<div class="api-content-property">
  <h3>propertyName</h3>
  <span class="property-type">type</span>
</div>
```

## Target URLs

The parser fetches documentation from:
- **Server API**: `https://developer.servicenow.com/dev.do#!/reference/api/zurich/server`
- **Client API**: `https://developer.servicenow.com/dev.do#!/reference/api/zurich/client`
- **Legacy Server API**: `https://developer.servicenow.com/dev.do#!/reference/api/zurich/server_legacy`

## Troubleshooting

### Authentication Issues
If you get 401 errors:
1. Update your `COOKIE` and `USER_TOKEN` in `.env`
2. Get fresh values from developer.servicenow.com
3. Check the Network tab in DevTools for the `devportal.do` request

### Empty Responses
If classes return empty:
1. Check that the HTML structure hasn't changed
2. Verify the URL is correct
3. Enable debug logging to see raw HTML

### Type Compilation Errors
If generated types don't compile:
1. Check the type normalization in `normalizeType()`
2. Verify type mappings in `SNClientConfigObjs.ts`
3. Review generated `.d.ts` files for syntax issues

## Future Enhancements

1. **Parallel Processing** - Implement concurrent class fetching
2. **Incremental Updates** - Only fetch changed documentation
3. **Better Caching** - Persistent cache across sessions
4. **HTML Structure Detection** - Auto-adapt to HTML changes
5. **Validation Suite** - Automated testing of generated types

## Testing

To test the HTML parser:

```bash
# 1. Enable HTML mode
echo "USE_HTML_PARSER=true" >> .env

# 2. Compile
npx tsc

# 3. Run a limited test
node dist/index.js

# 4. Check generated files
ls -la server/*.d.ts
ls -la client/*.d.ts
```

## Notes

- The HTML parser requires a valid ServiceNow developer account
- Rate limiting is important to avoid being blocked
- The parser is designed to handle variations in HTML structure
- Caching significantly improves performance for repeated runs
- Always test generated types in a real ServiceNow project

## Migration from JSON to HTML

1. **No Code Changes Required** - Just toggle the environment variable
2. **Same Output Structure** - TypeScript definitions maintain the same format
3. **Gradual Migration** - Can switch between modes as needed
4. **Validation** - Compare outputs between modes to ensure consistency

## Support

For issues or questions:
1. Check the console output for detailed error messages
2. Review the generated TypeScript files for completeness
3. Verify your authentication credentials are current
4. Ensure the HTML structure matches expected selectors

## Version History

- **v0.0.20** - Added HTML parser support with Cheerio
- **v0.0.17** - Last version with JSON-only parsing