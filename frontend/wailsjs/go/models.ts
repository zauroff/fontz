export namespace gfonts {
	
	export class FontFamily {
	    family: string;
	    category: string;
	    variants: string[];
	    subsets: string[];
	    version: string;
	    lastModified: string;
	    files: Record<string, string>;
	    menu?: string;
	
	    static createFrom(source: any = {}) {
	        return new FontFamily(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.family = source["family"];
	        this.category = source["category"];
	        this.variants = source["variants"];
	        this.subsets = source["subsets"];
	        this.version = source["version"];
	        this.lastModified = source["lastModified"];
	        this.files = source["files"];
	        this.menu = source["menu"];
	    }
	}
	export class ListQuery {
	    search: string;
	    category: string;
	    subset: string;
	    sort: string;
	    offset: number;
	    limit: number;
	
	    static createFrom(source: any = {}) {
	        return new ListQuery(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.search = source["search"];
	        this.category = source["category"];
	        this.subset = source["subset"];
	        this.sort = source["sort"];
	        this.offset = source["offset"];
	        this.limit = source["limit"];
	    }
	}
	export class ListResult {
	    items: FontFamily[];
	    total: number;
	    offset: number;
	    limit: number;
	
	    static createFrom(source: any = {}) {
	        return new ListResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.items = this.convertValues(source["items"], FontFamily);
	        this.total = source["total"];
	        this.offset = source["offset"];
	        this.limit = source["limit"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace installer {
	
	export class InstallRequest {
	    family: string;
	    variants: string[];
	    overwrite: boolean;
	
	    static createFrom(source: any = {}) {
	        return new InstallRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.family = source["family"];
	        this.variants = source["variants"];
	        this.overwrite = source["overwrite"];
	    }
	}
	export class VariantResult {
	    variant: string;
	    status: string;
	    filename?: string;
	    error?: string;
	    collision?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new VariantResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.variant = source["variant"];
	        this.status = source["status"];
	        this.filename = source["filename"];
	        this.error = source["error"];
	        this.collision = source["collision"];
	    }
	}
	export class InstallResult {
	    family: string;
	    variants: VariantResult[];
	
	    static createFrom(source: any = {}) {
	        return new InstallResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.family = source["family"];
	        this.variants = this.convertValues(source["variants"], VariantResult);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

