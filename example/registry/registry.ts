/*--------------------------------------------------------------------------

TypeBox

The MIT License (MIT)

Copyright (c) 2017-2026 Haydn Paterson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---------------------------------------------------------------------------*/

import Schema from 'typebox/schema'

// ------------------------------------------------------------------
// Explicit Registry: three references
//
// This example registers three schema documents that reference one
// another:
//
//   Node      - a self recursive tree node ($ref: 'Node')
//   TreeMeta  - metadata that points back at the owning Tree
//   Tree      - a document that references both Node and TreeMeta
//
// The three schemas are bound explicitly before any validator is
// generated. Recursive references are allowed and terminate lazily at
// validation time.
// ------------------------------------------------------------------

const Node = {
  $id: 'Node',
  type: 'object',
  properties: {
    id: { type: 'number' },
    label: { type: 'string' },
    children: { type: 'array', items: { $ref: 'Node' } } // (1) self reference
  },
  required: ['id']
}

const TreeMeta = {
  $id: 'TreeMeta',
  type: 'object',
  properties: {
    name: { type: 'string' },
    owner: { $ref: 'Tree' } // (2) mutual reference back to Tree
  },
  required: ['name']
}

const Tree = {
  $id: 'Tree',
  type: 'object',
  properties: {
    root: { $ref: 'Node' }, // (3a) cross document reference
    meta: { $ref: 'TreeMeta' } // (3b) cross document reference
  },
  required: ['root']
}

export function main(): void {
  // Build the explicit collection. A source label is retained with
  // each document in the registry index.
  const registry = new Schema.XRegistry()
  registry.Register(Node, 'schemas/node.json')
  registry.Register(TreeMeta, 'schemas/tree-meta.json')
  registry.Register(Tree, 'schemas/tree.json')

  // Bind all references up front. Throws if a $ref cannot be resolved
  // inside this collection or an authorized external mapping.
  const result = registry.Bind()
  console.log('bound:', result.bound)

  // Validators are only produced after binding succeeds.
  const nodeValidator = registry.Compile('Node')
  const treeValidator = registry.Compile('Tree')

  const validTree = {
    root: {
      id: 1,
      label: 'root',
      children: [{ id: 2, label: 'a' }, { id: 3, children: [{ id: 4 }] }]
    },
    meta: {
      name: 'forest',
      owner: { root: { id: 9 } }
    }
  }

  console.log('node ok:', nodeValidator.Check({ id: 7, children: [{ id: 8 }] }))
  console.log('tree ok:', treeValidator.Check(validTree))
  console.log('tree bad:', treeValidator.Check({ root: { id: 'x' } }))

  // The retained schema index maps each $id to its source label.
  for (const entry of registry.Index()) {
    console.log('index:', entry.id, '<-', entry.source)
  }
}
