import React, { useState } from 'react'
import { GraphView as ReactDigraph, INode, IEdge } from 'react-digraph'

const NODE_KEY = 'id'

// Function to generate a color based on the node name
const getNodeColor = (name: string) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = hash % 360
  return `hsl(${hue}, 65%, 55%)`
}

const GraphConfig = {
  NodeTypes: {
    empty: {
      typeText: 'ENS',
      shapeId: '#empty',
      shape: (
        <symbol viewBox="0 0 100 100" id="empty" width="100" height="100">
          <circle cx="50" cy="50" r="45" fill="currentColor" />
        </symbol>
      ),
    },
  },
  NodeSubtypes: {},
  EdgeTypes: {
    emptyEdge: {
      shapeId: '#emptyEdge',
      shape: (
        <symbol viewBox="0 0 50 50" id="emptyEdge" width="50" height="50">
          <circle cx="25" cy="25" r="8" fill="currentColor" />
        </symbol>
      ),
    },
  },
}

type GraphViewProps = {
  nodes: INode[]
  edges: IEdge[]
  onSelectNode: (node: INode) => void
}

export default function GraphView({ nodes, edges, onSelectNode }: GraphViewProps) {
  const [selected, setSelected] = useState<any>(null)

  const handleSelect = (selection: any) => {
    console.log('handleSelect called with:', selection)
    setSelected(selection)
    
    // Try different possible selection structures
    if (selection) {
      if (selection.nodes && selection.nodes.length > 0) {
        const node = selection.nodes[0]
        console.log('Node from selection.nodes:', node)
        onSelectNode(node)
      } else if (typeof selection === 'object' && selection.id) {
        // Selection might be the node itself
        console.log('Selection is node itself:', selection)
        onSelectNode(selection)
      }
    }
  }

  const handleClickNode = (viewNode: any) => {
    console.log('handleClickNode called with:', viewNode)
    if (viewNode && viewNode.node) {
      onSelectNode(viewNode.node)
    } else if (viewNode) {
      onSelectNode(viewNode)
    }
  }

  // Custom node renderer to show first 2 letters
  const renderNode = (nodeRef: any, data: any, id: string, selected: boolean, hovered: boolean) => {
    const title = data.title || ''
    const initials = title.substring(0, 2).toUpperCase()
    const color = getNodeColor(title)
    
    return (
      <g>
        <circle 
          r="45" 
          fill={color}
          stroke={selected ? '#000' : 'none'}
          strokeWidth={selected ? 3 : 0}
        />
        <text
          textAnchor="middle"
          alignmentBaseline="middle"
          fill="white"
          fontSize="24"
          fontWeight="bold"
        >
          {initials}
        </text>
      </g>
    )
  }

  return (
    <div style={{ height: '600px', width: '100%' }}>
      <ReactDigraph
        nodes={nodes}
        edges={edges}
        selected={selected}
        nodeTypes={GraphConfig.NodeTypes}
        nodeSubtypes={GraphConfig.NodeSubtypes}
        edgeTypes={GraphConfig.EdgeTypes}
        onSelect={handleSelect}
        onUpdateNode={() => {}} // Disable node updates
        onCreateNode={() => {}} // Disable node creation
        onCreateEdge={() => {}} // Disable edge creation
        nodeKey={NODE_KEY}
        renderNode={renderNode}
        renderNodeText={(data) => data.title}
        readOnly={false}
      />
    </div>
  )
}
