declare module 'd3' {
	export function format(specifier: string): (value: number) => string;
	export function formatLocale(locale: string): {
		format: (specifier: string) => (value: number) => string;
	};
	export function timeFormat(specifier: string): (date: Date) => string;
	export type FormatSpecifier = (value: number) => string;

	// Hierarchy and pack layout types
	export interface HierarchyNode<T> {
		data: T;
		value?: number;
		x?: number;
		y?: number;
		r?: number;
		children?: HierarchyNode<T>[];
		sum(value: (d: T) => number): HierarchyNode<T>;
		sort(compare: (a: HierarchyNode<T>, b: HierarchyNode<T>) => number): HierarchyNode<T>;
	}

	export interface HierarchyCircularNode<T> extends HierarchyNode<T> {
		x: number;
		y: number;
		r: number;
	}

	export interface PackLayout<T> {
		size(size: [number, number]): PackLayout<T>;
		padding(padding: number): PackLayout<T>;
		(root: HierarchyNode<T>): HierarchyCircularNode<T>;
	}

	export function hierarchy<T>(data: T): HierarchyNode<T>;
	export function pack<T>(): PackLayout<T>;
}
