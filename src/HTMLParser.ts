/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable max-lines */
import axios, { AxiosResponse } from 'axios';
const cheerio = require('cheerio');
import { SNC } from './common';
import {
  typeConversionMap,
  incorrectTypesMap,
  disallowedParamNames,
  optionalParamExceptions,
} from './SNClientConfigObjs';
// Browser parser removed due to compatibility issues

// Cache for HTML responses to avoid redundant requests
const htmlCache = new Map<string, { html: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// HTML selectors for parsing
const SELECTORS = {
  navigation: 'a.dps-sidebar-nav-group-label',
  methodGroup: 'div.api-content-method-group',
  methodSignature: 'h3',
  paramTable: 'table.api-table',
  tableWrapper: 'div.table-wrapper',
  propertySection: 'div.api-content-property',
};

// Rate limiting configuration
const MS_BETWEEN_REQUESTS = parseInt(process.env.HTML_PARSE_DELAY_MS || '500', 10);
const MAX_RETRY_ATTEMPTS = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10);

function getClient() {
  const cookie = process.env.COOKIE;
  const userToken = process.env.USER_TOKEN;
  return axios.create({
    headers: {
      Cookie: cookie,
      'X-UserToken': userToken,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
    baseURL: 'https://developer.servicenow.com',
    timeout: 30000,
  });
}

async function wait(ms: number = MS_BETWEEN_REQUESTS): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRY_ATTEMPTS,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    const delay = (MAX_RETRY_ATTEMPTS - retries + 1) * 1000;
    console.log(`Retrying after ${delay}ms... (${retries} attempts remaining)`);
    await wait(delay);
    return retryWithBackoff(fn, retries - 1);
  }
}

export async function fetchHTMLPage(url: string): Promise<string> {
  // Check cache first
  if (process.env.HTML_CACHE_ENABLED === 'true') {
    const cached = htmlCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Using cached HTML for ${url}`);
      return cached.html;
    }
  }

  return retryWithBackoff(async () => {
    const response: AxiosResponse<string> = await getClient().get(url);
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
    }

    const html = response.data;
    
    // Cache the response
    if (process.env.HTML_CACHE_ENABLED === 'true') {
      htmlCache.set(url, { html, timestamp: Date.now() });
    }

    await wait(); // Rate limiting
    return html;
  });
}

export function buildDocumentationURL(opts: SNC.HierarchyOpts): string {
  const { release, api } = opts;
  const baseUrl = 'https://developer.servicenow.com/dev.do#!/reference/api';
  
  // Map API types to URL paths
  const apiPath = api === 'server_legacy' ? 'server_legacy' : api;
  
  return `${baseUrl}/${release}/${apiPath}`;
}

export async function parseNavigationHTML(html: string): Promise<SNC.NavbarItem[]> {
  const $ = cheerio.load(html);
  const navItems: SNC.NavbarItem[] = [];
  const namespaceMap = new Map<string, SNC.NavbarItem>();

  // Parse navigation links
  $(SELECTORS.navigation).each((_: number, element: any) => {
    const $link = $(element);
    const href = $link.attr('href') || '';
    const text = $link.text().trim();
    
    // Extract namespace and class information
    const namespaceMatch = text.match(/^(sn_\w+)\s*-\s*(.+)$/);
    
    if (namespaceMatch) {
      const [, namespace, className] = namespaceMatch;
      
      if (!namespaceMap.has(namespace)) {
        namespaceMap.set(namespace, {
          name: namespace,
          dc_identifier: namespace,
          type: 'Namespace',
          items: [],
        });
      }
      
      const namespaceItem = namespaceMap.get(namespace)!;
      namespaceItem.items.push({
        name: className,
        dc_identifier: href,
        type: 'Class',
      });
    } else {
      // Global/no-namespace class
      const globalNamespace = namespaceMap.get('global') || {
        name: 'global',
        dc_identifier: 'no-namespace',
        type: 'Namespace',
        items: [],
      };
      
      globalNamespace.items.push({
        name: text,
        dc_identifier: href,
        type: 'Class',
      });
      
      namespaceMap.set('global', globalNamespace);
    }
  });

  return Array.from(namespaceMap.values());
}

export async function parseClassHTML(
  html: string,
  className: string,
): Promise<SNC.ClassData | null> {
  const $ = cheerio.load(html);
  
  // Create base class data structure
  const classData: SNC.ClassData = {
    name: className,
    type: 'Class',
    dc_identifier: className,
    is_current: true,
    is_highlighted: true,
    order: 0,
    release: '',
    text: '',
    children: [],
  };

  // Parse methods
  $(SELECTORS.methodGroup).each((_: number, methodElement: any) => {
    const $method = $(methodElement);
    const methodChild = parseMethodGroup($, $method);
    if (methodChild) {
      classData.children!.push(methodChild);
    }
  });

  // Parse properties
  $(SELECTORS.propertySection).each((_: number, propertyElement: any) => {
    const $property = $(propertyElement);
    const propertyChild = parsePropertyGroup($, $property);
    if (propertyChild) {
      classData.children!.push(propertyChild);
    }
  });

  return classData.children!.length > 0 ? classData : null;
}

function parseMethodGroup($: any, $method: any): SNC.ClassChild | null {
  // Extract method signature from h3
  const signature = $method.find(SELECTORS.methodSignature).first().text().trim();
  if (!signature) return null;

  // Parse method name and initial parameters from signature
  const methodMatch = signature.match(/^(\w+)\s*\((.*?)\)/);
  if (!methodMatch) return null;

  const [, methodName, paramString] = methodMatch;

  // Create method structure
  const methodChild: SNC.ClassChild = {
    name: methodName,
    type: 'Method',
    order: 0,
    release: '',
    text: $method.find('p').first().text().trim() || '',
    hasExample: $method.find('pre').length > 0,
    hasParameter: false,
    hasReturn: false,
    children: [],
  };

  // Parse parameter table
  const $tables = $method.find(SELECTORS.paramTable);
  
  $tables.each((index: number, table: any) => {
    const $table = $(table);
    const $headers = $table.find('thead th');
    const headerTexts = $headers.map((_: number, el: any) => $(el).text().trim().toLowerCase()).get();

    if (headerTexts.includes('name') && headerTexts.includes('type')) {
      // This is a parameters table
      methodChild.hasParameter = true;
      parseParametersFromTable($, $table, methodChild);
    } else if (headerTexts.includes('type') && headerTexts.includes('description')) {
      // This is a returns table
      methodChild.hasReturn = true;
      parseReturnFromTable($, $table, methodChild);
    }
  });

  return methodChild;
}

function parsePropertyGroup($: any, $property: any): SNC.ClassChild | null {
  const propertyName = $property.find('h3').first().text().trim();
  if (!propertyName) return null;

  const propertyType = $property.find('.property-type').text().trim() || 'any';
  const description = $property.find('p').first().text().trim() || '';

  const propertyChild: SNC.ClassChild = {
    name: propertyName,
    type: 'Property',
    order: 0,
    release: '',
    text: description,
    hasExample: false,
    hasParameter: false,
    hasReturn: false,
    children: [{
      name: propertyName,
      type: 'Property',
      order: 0,
      release: '',
      text: propertyType,
      variable: propertyName,
    }],
  };

  return propertyChild;
}

function parseParametersFromTable(
  $: any,
  $table: any,
  methodChild: SNC.ClassChild,
): void {
  const $rows = $table.find('tbody tr');
  
  $rows.each((_: number, row: any) => {
    const $row = $(row);
    const $cells = $row.find('td');
    
    if ($cells.length >= 3) {
      const paramName = $cells.eq(0).text().trim();
      const paramType = normalizeType($cells.eq(1).text().trim());
      const paramDescription = $cells.eq(2).text().trim();
      
      // Check if parameter is optional
      const isOptional = paramDescription.toLowerCase().indexOf('optional') !== -1 ||
                        paramName.includes('?');
      
      // Skip disallowed parameter names
      if ((disallowedParamNames as Set<string>).has(paramName)) return;
      
      const paramDescriptor: SNC.MethodDescriptor = {
        name: paramName.replace('?', ''),
        type: 'Parameter',
        order: methodChild.children!.length,
        release: '',
        text: paramDescription,
        text2: isOptional ? 'Optional' : '',
        variable: paramType,
      };
      
      methodChild.children!.push(paramDescriptor);
    }
  });
}

function parseReturnFromTable(
  $: any,
  $table: any,
  methodChild: SNC.ClassChild,
): void {
  const $firstRow = $table.find('tbody tr').first();
  if ($firstRow.length === 0) return;
  
  const $cells = $firstRow.find('td');
  if ($cells.length >= 1) {
    const returnType = normalizeType($cells.eq(0).text().trim());
    const returnDescription = $cells.length >= 2 ? $cells.eq(1).text().trim() : '';
    
    const returnDescriptor: SNC.MethodDescriptor = {
      name: 'return',
      type: 'Return',
      order: methodChild.children!.length,
      release: '',
      text: returnDescription,
      variable: returnType || 'void',
    };
    
    methodChild.children!.push(returnDescriptor);
  }
}

function normalizeType(type: string): string {
  if (!type) return 'any';
  
  // Clean up the type string
  let normalized = type.trim()
    .replace(/\s+/g, ' ')
    .replace(/GlideRecord\s*<\s*(.+?)\s*>/, 'GlideRecord')
    .replace(/Array\s*<\s*(.+?)\s*>/, '$1[]');
  
  // Apply type conversions - typeConversionMap is an object with RegExp values
  for (const [targetType, regex] of Object.entries(typeConversionMap)) {
    if ((regex as RegExp).test(normalized)) {
      normalized = targetType;
      break;
    }
  }
  
  // Apply incorrect types corrections - incorrectTypesMap is a Map
  const correction = incorrectTypesMap.get(normalized);
  if (correction) {
    normalized = correction;
  }
  
  return normalized;
}

export async function getHTMLAPIHierarchy(opts: SNC.HierarchyOpts): Promise<SNC.SNApiHierarchy> {
  const hierarchy: SNC.SNApiHierarchy = {};
  
  try {
    // Fetch the main documentation page
    const url = buildDocumentationURL(opts);
    console.log(`Fetching HTML documentation from: ${url}`);
    const html = await fetchHTMLPage(url);
    
    // Parse navigation to get all classes
    const navItems = await parseNavigationHTML(html);
    console.log(`Found ${navItems.length} namespaces in HTML documentation`);
    
    if (navItems.length === 0) {
      console.log('No namespaces found with static parser. The page likely requires JavaScript.');
      console.log('Please set USE_BROWSER_PARSER=true in your .env file to use browser automation.');
      return hierarchy;
    }
    
    // Process each namespace
    for (const namespace of navItems) {
      const namespaceName = namespace.name === 'global' ? 'no-namespace' : namespace.name;
      const classes: SNC.SNClass[] = [];
      
      console.log(`Processing namespace: ${namespaceName} with ${namespace.items.length} classes`);
      
      // Process each class in the namespace
      for (const item of namespace.items) {
        if (item.dc_identifier) {
          try {
            // Construct full URL for the class
            const classUrl = item.dc_identifier.startsWith('http')
              ? item.dc_identifier
              : `https://developer.servicenow.com${item.dc_identifier}`;
            
            console.log(`  Fetching class: ${item.name}`);
            const classHtml = await fetchHTMLPage(classUrl);
            const classData = await parseClassHTML(classHtml, item.name);
            
            if (classData) {
              // Convert to SNClass format
              const snClass = convertClassDataToSNClass(classData, opts);
              classes.push(snClass);
            }
          } catch (error) {
            console.warn(`  Failed to fetch class ${item.name}:`, error);
          }
        }
      }
      
      if (classes.length > 0) {
        hierarchy[namespaceName] = { classes };
      }
    }
    
    return hierarchy;
  } catch (error) {
    console.error('Failed to fetch HTML API hierarchy:', error);
    throw error;
  }
}

function convertClassDataToSNClass(classData: SNC.ClassData, opts: SNC.HierarchyOpts): SNC.SNClass {
  const methods: SNC.SNMethodMap = {};
  const properties: SNC.Property[] = [];
  const dependencies: SNC.SNClassDependency[] = [];
  
  // Process children (methods and properties)
  if (classData.children) {
    for (const child of classData.children) {
      if (child.type === 'Method') {
        const methodName = child.name;
        
        if (!methods[methodName]) {
          methods[methodName] = {
            description: child.text || '',
            instances: [],
          };
        }
        
        // Create method instance
        const instance: SNC.SNMethodInstance = {
          params: [],
          returns: undefined,
        };
        
        // Process method children (parameters and return)
        if (child.children) {
          for (const methodChild of child.children) {
            if (methodChild.type === 'Parameter') {
              instance.params.push({
                name: methodChild.name,
                type: methodChild.variable || 'any',
                description: methodChild.text || '',
                optional: methodChild.text2 === 'Optional',
              });
            } else if (methodChild.type === 'Return') {
              instance.returns = methodChild.variable || 'void';
            }
          }
        }
        
        methods[methodName].instances.push(instance);
      } else if (child.type === 'Property') {
        if (child.children && child.children[0]) {
          properties.push({
            name: child.name,
            type: child.children[0].text || 'any',
          });
        }
      }
    }
  }
  
  return {
    name: classData.name,
    methods,
    properties,
    dependencies,
  };
}