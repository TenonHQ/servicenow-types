/* eslint-disable @typescript-eslint/consistent-type-imports */
/* eslint-disable max-lines */
import axios, { AxiosResponse } from 'axios';
import striptags from 'striptags';
import { SNC } from './common';
import {
  buildDocumentationURL,
  fetchHTMLPage,
  getHTMLAPIHierarchy,
  parseNavigationHTML,
} from './HTMLParser';
import {
  disallowedParamNames,
  incorrectTypesMap,
  nonDependencyTypes,
  optionalParamExceptions,
  typeConversionMap,
} from './SNClientConfigObjs';
import { NO_NAMESPACE } from './TSGenerator';
let client: any = null;

function getClient() {
  if (!client) {
    const cookie = process.env.COOKIE;
    const userToken = process.env.USER_TOKEN;
    client = axios.create({
      headers: {
        Cookie: cookie,
        'X-UserToken': userToken,
      },
      baseURL: 'https://developer.servicenow.com',
    });
  }
  return client;
}

const CLIENT_API = 'client';
const LEGACY_API = 'server_legacy';
const MS_BETWEEN_REQUESTS = 500;

async function getRootConfig(opts: SNC.HierarchyOpts) {
  const { release, api, useHTML } = opts;

  // Use HTML mode if specified
  if (useHTML === true) {
    console.log(`Using HTML parser for ${api}`);
    const url = buildDocumentationURL(opts);
    const html = await fetchHTMLPage(url);
    const navItems = await parseNavigationHTML(html);

    // Convert to expected format
    return {
      blurb: '',
      class_data: null as any,
      is_namespace_supported: true,
      navbar: navItems,
      release,
      sub_type: '',
      type: api,
    } as SNC.DocsBase;
  }

  // Fallback to JSON mode
  try {
    const res: AxiosResponse<SNC.SNResponse<SNC.DocsBase>> =
      await getClient().get('/devportal.do', {
        params: {
          sysparm_data: JSON.stringify({
            action: 'api.docs',
            data: {
              id: api,
              release,
            },
          }),
        },
      });
    return res.data.result.data;
  } catch (e) {
    throw e;
  }
}

async function getClassInfo(classArgs: {
  release: string;
  id: string;
  useHTML?: boolean;
}): Promise<SNC.ClassData | null> {
  const { release, id, useHTML } = classArgs;
  try {
    const res: AxiosResponse = await getClient().get('/devportal.do', {
      params: {
        sysparm_data: JSON.stringify({
          action: 'api.docs',
          data: {
            id,
            release,
          },
        }),
      },
    });

    // Check various response scenarios
    if (!res.data || res.data === '' || res.data === null) {
      console.warn(`Empty or null response for class ${id}, skipping...`);
      return null;
    }

    if (!res.data.result || !res.data.result.data) {
      console.warn(
        `Invalid structure for class ${id}, response:`,
        JSON.stringify(res.data).substring(0, 200),
      );
      return null;
    }

    return res.data.result.data.class_data;
  } catch (e) {
    const error = e as any;
    if (error.response && error.response.status === 401) {
      console.error(
        'Authentication failed. Your cookie or token may have expired.',
      );
      console.error(
        'Please get fresh credentials from developer.servicenow.com',
      );
      throw e;
    }
    console.warn(`Failed to fetch class ${id}:`, error.message || error);
    return null;
  }
}

async function wait() {
  return await new Promise((resolve, reject) => {
    setTimeout(resolve, MS_BETWEEN_REQUESTS);
  });
}

export async function getAPIHierarchy(opts: SNC.HierarchyOpts) {
  // Use HTML parser if specified
  if (opts.useHTML === true) {
    console.log(`Using HTML parser for complete hierarchy`);
    return await getHTMLAPIHierarchy(opts);
  }

  // Original JSON-based implementation
  let hierarchy: SNC.SNApiHierarchy = {};
  const root = await getRootConfig(opts);
  const { navbar } = root;
  const namespacePromises: Record<
    string,
    Promise<{ classes: SNC.SNClass[] }>
  > = {};
  const navbarItems: SNC.NavbarItem[] = [];
  try {
    if (isClient(opts)) {
      const clientNavbar = navbar as SNC.ClientNavBar;
      hierarchy = await processClientNavBar({ ...opts, navbar: clientNavbar });
    } else if (isLegacy(opts)) {
      const legacyNavbar = navbar as SNC.LegacyNavBar;
      hierarchy[NO_NAMESPACE] = await processLegacyNavbar({
        ...opts,
        navbar: legacyNavbar,
      });
    } else {
      for (const namespace of navbar as SNC.NavbarItem[]) {
        namespacePromises[getNamespaceName(namespace)] = processNamespace({
          ...opts,
          namespace,
        });
        await wait();
      }
      await Promise.all(Object.values(namespacePromises));
      for (const nameSpaceName in namespacePromises) {
        hierarchy[nameSpaceName] = await namespacePromises[nameSpaceName];
      }
    }
    return hierarchy;
  } catch (e) {
    console.error(navbarItems);
    throw e;
  }
}

function isClient(opts: SNC.HierarchyOpts): boolean {
  return opts.api === CLIENT_API;
}

function isLegacy(opts: SNC.HierarchyOpts): boolean {
  return opts.api === LEGACY_API;
}

async function processLegacyNavbar(opts: SNC.LegacyNavBarOpts) {
  const { navbar, release } = opts;
  const classPromises: Array<Promise<SNC.ClassData | null>> = [];
  for (const _class of navbar) {
    classPromises.push(
      getClassInfo({
        release,
        id: _class.dc_identifier || '',
        useHTML: opts.useHTML,
      }),
    );
    await wait();
  }
  const classResults = await Promise.all(classPromises);
  const classes = classResults
    .filter((_class): _class is SNC.ClassData => _class !== null)
    .map((_class) => {
      return processClass({
        ...opts,
        _class,
        namespace: {
          dc_identifier: '',
          items: [],
          name: NO_NAMESPACE,
          type: 'Namespace',
        },
      });
    });
  return { classes };
}

async function processClientNavBar(opts: SNC.ClientNavBarOpts) {
  const hierarchy: SNC.SNApiHierarchy = {};
  const { navbar, release } = opts;
  const clientSpace = navbar.client as SNC.ClassData[];
  const classPromises: Array<Promise<SNC.ClassData | null>> = [];
  for (const _class of clientSpace) {
    classPromises.push(
      getClassInfo({
        release,
        id: _class.dc_identifier || '',
        useHTML: opts.useHTML,
      }),
    );
    await wait();
  }
  const classResults = await Promise.all(classPromises);
  const classes = classResults
    .filter((_class): _class is SNC.ClassData => _class !== null)
    .map((_class) => {
      return processClass({
        ...opts,
        _class,
        namespace: {
          dc_identifier: '',
          items: [],
          name: NO_NAMESPACE,
          type: 'Namespace',
        },
      });
    });
  hierarchy[NO_NAMESPACE] = {
    classes,
  };

  return hierarchy;
}

function getNamespaceName(namespace: SNC.NavbarItem) {
  return namespace.name.split('-')[0].trim();
}

async function processNamespace(opts: SNC.NSOpts): Promise<SNC.SNApiNamespace> {
  const { namespace, release } = opts;
  let classes: SNC.SNClass[] = [];
  const classPromises = [];
  for (const item of namespace.items) {
    classPromises.push(
      getClassInfo({
        release,
        id: item.dc_identifier || '',
        useHTML: opts.useHTML,
      }),
    );
  }
  const classResults = await Promise.all(classPromises);
  classes = classResults
    .filter((_class): _class is SNC.ClassData => _class !== null)
    .map((_class) => {
      return processClass({ ...opts, _class });
    });
  return { classes };
}

function processClass(opts: SNC.ProcessClassOpts) {
  const { _class } = opts;
  const methods = getMethods(opts);
  const properties = getProperties(_class);
  const dependencies = getDependencies({
    ...opts,
    methods,
    _class,
    properties,
  });
  const classObj: SNC.SNClass = {
    name: _class.name.split(' ')[0],
    methods,
    dependencies,
    properties,
  };
  return classObj;
}

function getMethods(opts: SNC.ProcessClassOpts) {
  const { _class } = opts;
  const methods: Record<string, SNC.SNClassMethod> = {};
  if (_class.children) {
    const methodList = _class.children.filter(
      (child) => child.type === 'Method' || child.type === 'Constructor',
    );
    for (const curMethod of methodList) {
      const methodName = getMethodName(curMethod);
      if (methodName.includes('.')) {
        continue;
      }
      if (!methods.hasOwnProperty(methodName)) {
        const method: SNC.SNClassMethod = {
          description: striptags(curMethod.text) || '',
          instances: [],
        };
        methods[methodName] = method;
      }
      methods[methodName].instances.push(
        processMethod({ ...opts, method: curMethod }),
      );
    }
  }
  return methods;
}

function getProperties(c: SNC.ClassData): SNC.Property[] {
  if (c.children) {
    return c.children
      .filter((child) => child.type === 'Property')
      .map((prop) => {
        return {
          name: prop.name,
          type: determinePropertyType(prop),
        };
      });
  }
  return [];
}

function determinePropertyType(prop: SNC.ClassChild) {
  if (prop.children) {
    return parseType(
      prop.children.filter((child) => child.type === 'Parameter')[0].text,
    );
  }
  return '';
}

function getMethodName(method: SNC.ClassChild) {
  if (method.type === 'Constructor') {
    return 'constructor';
  }
  return sanitizeMethodName(method.name);
}

function containsOptional(texts: string[]) {
  for (const text of texts) {
    if (text.toLowerCase().includes('optional')) {
      return true;
    }
  }
  return false;
}

function isOptionalParam(
  opts: SNC.ProcessMethodOpts,
  param: SNC.MethodDescriptor,
  textChecks: string[],
) {
  const { api, method, _class } = opts;
  const curExceptions = optionalParamExceptions.get(api);
  if (curExceptions) {
    const methodName = getMethodName(method);
    const query = `${_class.name}->${methodName}->${sanitizeParamName(
      param.name,
    )}`;
    if (curExceptions.has(query)) {
      return true;
    }
  }
  return containsOptional(textChecks);
}

function processMethod(opts: SNC.ProcessMethodOpts): SNC.SNMethodInstance {
  const { method } = opts;
  const params: SNC.SNMethodParam[] = [];
  let returns;
  if (method.children) {
    for (const child of method.children) {
      if (child.type === 'Parameter') {
        // some methods have child data types in their params...
        // this check removes them so we can manually update those for now
        if (child.name.includes('.')) {
          continue;
        }
        const strippedText2 = striptags(child.text2 || '');
        const optional = isOptionalParam(opts, child, [
          child.name,
          strippedText2,
        ]);
        params.push({
          name: sanitizeParamName(child.name),
          type: parseType(child.text),
          description: strippedText2,
          optional,
        });
      }
      if (child.type === 'Return') {
        const stripped = striptags(child.name, [
          '<String>',
          '<GlideHTTPHeader>',
        ]);
        returns = parseType(stripped);
      }
    }
  }
  return {
    params,
    returns,
  };
}

function getDependencies(opts: SNC.GetDependenciesOpts) {
  const { methods, _class, properties } = opts;
  const depSet = new Set<string>();
  const dependencies: SNC.SNClassDependency[] = [];
  for (const methodName in methods) {
    const method = methods[methodName];
    for (const instance of method.instances) {
      for (const p of instance.params) {
        if (validDep(p.type)) {
          depSet.add(p.type);
        }
      }
      if (instance.returns) {
        if (validDep(instance.returns)) {
          depSet.add(instance.returns);
        }
      }
    }
  }
  for (const prop of properties) {
    if (validDep(prop.type)) {
      depSet.add(prop.type);
    }
  }
  depSet.forEach((cur) => {
    dependencies.push({ name: cur });
  });
  return dependencies;
  function validDep(type: string) {
    const normalized = type.toLowerCase();
    // not using this right now, but I think we will need it later (circular dependencies)
    // let typeIsSamAsClass = normalized !== _class.name.split(" ")[0].toLowerCase();
    if (!nonDependencyTypes.has(normalized)) {
      return true;
    }
    return false;
  }
}

function parseType(inputType: string) {
  // remove HTML from some types
  const stripped = striptags(inputType);
  // take first word because sometimes there's more words. Not the best solution I know...
  const firstWord = stripped.split(' ')[0];
  const noSymbols = firstWord.replace(/,/, '');
  const normalized = getNormalizedType(noSymbols);
  return normalized;
}

function getNormalizedType(type: string) {
  for (const resType in typeConversionMap) {
    const reg = typeConversionMap[resType];
    if (reg.test(type)) {
      return resType;
    }
  }
  if (type.toLowerCase().indexOf('scoped') === 0) {
    return type.slice('scoped'.length);
  }
  if (incorrectTypesMap.has(type)) {
    return incorrectTypesMap.get(type)!;
  }
  return type;
}

function sanitizeParamName(name: string) {
  if (disallowedParamNames.has(name)) {
    name = `_${name}`;
  }
  const splitName = name.split('(')[0];
  return splitName.replace(/[\s\.]/g, '_');
}

function sanitizeMethodName(name: string) {
  return name.split('(')[0];
}
