import React, { useState } from 'react'
import { ethers } from 'ethers'
import GraphView from './GraphView'
import { INode, IEdge } from 'react-digraph'

type LogEntry = {
  time: string
  level: 'info' | 'error'
  text: string
}

type Transaction = {
  hash: string
  from: string
  to: string | null
  value: string
  blockNumber: number
  timestamp?: number
}

export default function App() {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'single' | 'graph'>('single')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [profile, setProfile] = useState<{
    name?: string
    avatar?: string
    description?: string
    url?: string
    address?: string
    resolver?: string
    reverse?: string
    balance?: string
  } | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [graphNodes, setGraphNodes] = useState<INode[]>([])
  const [graphEdges, setGraphEdges] = useState<IEdge[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  const addLog = (level: LogEntry['level'], text: string) => {
    setLogs((s) => [
      { time: new Date().toISOString(), level, text },
      ...s,
    ])
  }

  async function doLookup(name: string) {
    if (!name) return
    setLoading(true)
    setProfile(null)
    setTransactions([])
    setShowModal(true)
    addLog('info', `Resolving ENS name: ${name}`)
    try {
      // Use a public Ethereum JSON-RPC endpoint (no API key required by default)
      const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com')

      // If input looks like an address, treat it as an address; otherwise attempt ENS resolution
      const isAddress = ethers.isAddress(name)
      let resolvedAddress: string | null = null
      if (isAddress) {
        resolvedAddress = name
        addLog('info', `Input is an address: ${name}`)
      } else {
        try {
          resolvedAddress = await provider.resolveName(name)
          addLog('info', `Resolved address: ${String(resolvedAddress)}`)
        } catch (resolveErr: any) {
          addLog('error', `resolveName failed: ${String(resolveErr)}`)
        }
      }

      // Always log the namehash for ENS names
      try {
        const nh = ethers.namehash(name)
        addLog('info', `namehash: ${nh}`)
      } catch (nhErr: any) {
        // namehash may throw for raw addresses; ignore
      }

      if (!resolvedAddress) {
        addLog('error', `No address available for ${name}`)
        setProfile(null)
        return
      }

      // Basic on-chain diagnostics for the resolved address
      try {
        const balance = await provider.getBalance(resolvedAddress)
        const balStr = `${ethers.formatEther(balance)} ETH`
        addLog('info', `balance: ${balStr}`)
        // set basic profile with address and balance now
        setProfile((p) => ({ ...(p ?? {}), address: resolvedAddress, balance: balStr }))
      } catch (balErr: any) {
        addLog('error', `getBalance failed: ${String(balErr)}`)
      }

      try {
        const code = await provider.getCode(resolvedAddress)
        addLog('info', `code length: ${code ? code.length : 0}`)
      } catch (codeErr: any) {
        addLog('error', `getCode failed: ${String(codeErr)}`)
      }

      try {
        const txCount = await provider.getTransactionCount(resolvedAddress)
        addLog('info', `transactionCount: ${txCount}`)
      } catch (txErr: any) {
        addLog('error', `getTransactionCount failed: ${String(txErr)}`)
      }

      // Reverse lookup: check if address has a reverse ENS name
      try {
        const reverse = await provider.lookupAddress(resolvedAddress)
        addLog('info', `reverse name: ${String(reverse)}`)
        if (reverse) setProfile((p) => ({ ...(p ?? {}), reverse: reverse }))
      } catch (revErr: any) {
        addLog('error', `lookupAddress failed: ${String(revErr)}`)
      }

      // Resolver-specific data
      let resolver: any = null
      try {
        resolver = await provider.getResolver(name)
        if (!resolver) {
          addLog('info', `No resolver found for ${name}`)
        } else {
          addLog('info', `resolver address: ${resolver.address ?? 'unknown'}`)
          setProfile((p) => ({ ...(p ?? {}), resolver: resolver.address }))
        }
      } catch (resErr: any) {
        addLog('error', `getResolver failed: ${String(resErr)}`)
      }

      if (resolver) {
        // text record lookups removed per request

        // contentHash
        try {
          // Some resolvers implement getContentHash
          if (typeof resolver.getContentHash === 'function') {
            const ch = await resolver.getContentHash()
            addLog('info', `contentHash: ${String(ch)}`)
          } else {
            addLog('info', `getContentHash not available on resolver`)
          }
        } catch (chErr: any) {
          addLog('error', `getContentHash failed: ${String(chErr)}`)
        }

        // Profile fields: try to fetch name, avatar and description explicitly
        try {
          // fetch name
          try {
            const profName = await resolver.getText('name')
            if (profName) {
              addLog('info', `profile.name = ${String(profName)}`)
              setProfile((p) => ({ ...(p ?? {}), name: String(profName) }))
            }
          } catch (pnErr: any) {
            // not critical
          }

          // fetch url
          try {
            const foundUrl = await resolver.getText('url')
            if (foundUrl) {
              addLog('info', `profile.url = ${String(foundUrl)}`)
              setProfile((p) => ({ ...(p ?? {}), url: String(foundUrl) }))
            }
          } catch (urlErr: any) {
            // ignore
          }

          // fetch avatar and normalize
          try {
            const avatar = await resolver.getText('avatar')
            if (avatar) {
              let avatarUrl = String(avatar)
              if (avatarUrl.startsWith('ipfs://')) {
                avatarUrl = avatarUrl.replace('ipfs://', 'https://ipfs.io/ipfs/')
              }
              // ignore complex eip155 schemes for now
              addLog('info', `profile.avatar = ${avatarUrl}`)
              setProfile((p) => ({ ...(p ?? {}), avatar: avatarUrl }))
            }
          } catch (avErr: any) {
            // ignore
          }

          // fetch description
          try {
            const desc = await resolver.getText('description')
            if (desc) {
              addLog('info', `profile.description = ${String(desc)}`)
              setProfile((p) => ({ ...(p ?? {}), description: String(desc) }))
            }
          } catch (descErr: any) {
            // ignore
          }
        } catch (profileErr: any) {
          addLog('error', `profile fields fetch failed: ${String(profileErr)}`)
        }

        // ETH address via resolver (if available)
        try {
          if (typeof resolver.getAddress === 'function') {
            const ethAddr = await resolver.getAddress()
            addLog('info', `resolver.getAddress() => ${String(ethAddr)}`)
          } else if (typeof resolver.addr === 'function') {
            const ethAddr = await resolver.addr('60')
            addLog('info', `resolver.addr(60) => ${String(ethAddr)}`)
          } else {
            addLog('info', `resolver address lookup API not available`)
          }
        } catch (addrErr: any) {
          addLog('error', `resolver address lookup failed: ${String(addrErr)}`)
        }

        // Try to fetch arbitrary coin addresses for common coin types (60 = ETH, 61 = ETC)
        const coinTypes = [60, 61]
        for (const coin of coinTypes) {
          try {
            if (typeof resolver.getAddress === 'function') {
              const a = await resolver.getAddress(coin)
              addLog('info', `resolver.getAddress(${coin}) => ${String(a)}`)
            }
          } catch (coinErr: any) {
            addLog('error', `resolver.getAddress(${coin}) failed: ${String(coinErr)}`)
          }
        }

        // explicit TXT lookups removed per request
      }

      // Fetch last 10 transactions using Etherscan API
      if (resolvedAddress) {
        try {
          addLog('info', `Fetching recent transactions from Etherscan...`)
          
          // Get API key from environment variable (user needs to create .env file with VITE_ETHERSCAN_API_KEY)
          const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY || 'YourApiKeyToken'
          const etherscanUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${resolvedAddress}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=${apiKey}`
          
          const response = await fetch(etherscanUrl)
          const data = await response.json()
          
          if (data.status === '1' && data.result && Array.isArray(data.result)) {
            const txsWithDetails: Transaction[] = data.result.map((tx: any) => ({
              hash: tx.hash,
              from: tx.from,
              to: tx.to,
              value: ethers.formatEther(tx.value),
              blockNumber: parseInt(tx.blockNumber),
              timestamp: parseInt(tx.timeStamp)
            }))
            
            setTransactions(txsWithDetails)
            addLog('info', `Found ${txsWithDetails.length} recent transactions`)
          } else {
            addLog('info', `No transactions found or Etherscan API error: ${data.message || 'Unknown error'}`)
            setTransactions([])
          }
        } catch (txHistoryErr: any) {
          addLog('error', `Failed to fetch transaction history: ${String(txHistoryErr)}`)
          setTransactions([])
        }
      }
    } catch (err: any) {
      addLog('error', `Lookup failed: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const parseGraphInput = (input: string): { nodes: INode[], edges: IEdge[] } => {
    // Parse input like: [(A,B),(C,D),(C,B),(D,A)]
    // Extract pairs
    const pairRegex = /\(([^,]+),([^)]+)\)/g
    const pairs: [string, string][] = []
    let match
    
    while ((match = pairRegex.exec(input)) !== null) {
      pairs.push([match[1].trim(), match[2].trim()])
    }

    // Create unique nodes
    const nodeSet = new Set<string>()
    pairs.forEach(([from, to]) => {
      nodeSet.add(from)
      nodeSet.add(to)
    })

    const nodes: INode[] = Array.from(nodeSet).map((name, idx) => ({
      id: name,
      title: name,
      type: 'empty',
      x: (idx % 5) * 200 + 100,
      y: Math.floor(idx / 5) * 150 + 100
    }))

    const edges: IEdge[] = pairs.map(([ from, to], idx) => ({
      source: from,
      target: to,
      type: 'emptyEdge',
    }))

    return { nodes, edges }
  }

  const handleGraphSubmit = () => {
    const { nodes, edges } = parseGraphInput(query)
    setGraphNodes(nodes)
    setGraphEdges(edges)
    addLog('info', `Created graph with ${nodes.length} nodes and ${edges.length} edges`)
  }

  const handleNodeClick = (node: INode) => {
    console.log('handleNodeClick called with node:', node)
    setSelectedNode(node.id as string)
    setShowModal(true) // Explicitly set modal to true
    doLookup(node.title as string)
  }

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (mode === 'graph') {
      handleGraphSubmit()
    } else {
      await doLookup(query.trim())
    }
  }

  return (
    <div className="app-root">
      <main>
        <h1>ENS Search</h1>
        
        <div className="mode-selector" style={{marginBottom:16}}>
          <button 
            className={mode === 'single' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => setMode('single')}
            type="button"
          >
            Single Lookup
          </button>
          <button 
            className={mode === 'graph' ? 'mode-btn active' : 'mode-btn'}
            onClick={() => setMode('graph')}
            type="button"
          >
            Graph View
          </button>
        </div>

        <form onSubmit={onSubmit} className="search-box">
          <input
            aria-label="search"
            placeholder={mode === 'single' ? 'example.eth or 0xabc...' : '[(A,B),(C,D),(C,B),(D,A)]'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          <div style={{marginTop:8}}>
            <button type="submit" disabled={loading}>
              {loading ? 'Looking...' : mode === 'single' ? 'Lookup' : 'Build Graph'}
            </button>
          </div>
        </form>

        {mode === 'graph' && graphNodes.length > 0 && (
          <div style={{marginTop:24,border:'1px solid #e6eef6',borderRadius:8,overflow:'hidden'}}>
            <GraphView 
              nodes={graphNodes} 
              edges={graphEdges} 
              onSelectNode={handleNodeClick}
            />
          </div>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
              
              {loading && !profile && (
                <div className="profile-card">
                  <div className="profile-avatar skeleton skeleton-circle" />
                  <div className="profile-details">
                    <div className="skeleton skeleton-line" />
                    <div className="skeleton skeleton-sub" />
                    <div style={{height:12}} />
                    <div className="skeleton skeleton-line" style={{width:'90%'}} />
                    <div className="skeleton skeleton-line" style={{width:'80%'}} />
                  </div>
                </div>
              )}

              {profile && (
                <div className="profile-card">
                  <div className="profile-avatar">
                    {loading ? (
                      <div className="skeleton skeleton-circle" />
                    ) : profile.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.avatar} alt={profile.name ?? 'avatar'} />
                    ) : (
                      <div style={{color:'#9aa6b2'}}>{profile.name ? profile.name[0] : 'U'}</div>
                    )}
                  </div>
                  <div className="profile-details">
                    <h3 className="profile-name">
                      {loading ? (
                        <div className="skeleton skeleton-line" style={{display:'inline-block',width:'60%'}} />
                      ) : profile.url ? (
                        <a href={profile.url} target="_blank" rel="noreferrer" style={{color:'inherit',textDecoration:'none'}}>
                          {profile.url}
                        </a>
                      ) : (
                        profile.name ?? 'Unnamed'
                      )}
                    </h3>
                    {profile.balance && <div className="profile-sub">{profile.balance}</div>}
                    {loading && !profile.description && <div className="skeleton skeleton-line" style={{width:'70%'}} />}
                    {profile.description && !loading && <p className="profile-desc">{profile.description}</p>}
                    <div style={{marginTop:12,color:'#9aa6b2'}}>
                      <div>Address: {profile.address}</div>
                      {profile.reverse && <div>Reverse: {profile.reverse}</div>}
                    </div>
                  </div>
                </div>
              )}

              {transactions.length > 0 && (
                <div className="transactions-section">
                  <h3 style={{marginTop:24,marginBottom:12,fontSize:18,fontWeight:600}}>Recent Transactions</h3>
                  <div className="transactions-list">
                    {transactions.map((tx, idx) => (
                      <div key={tx.hash} className="transaction-item">
                        <div className="tx-header">
                          <span className="tx-label">#{transactions.length - idx}</span>
                          <a 
                            href={`https://etherscan.io/tx/${tx.hash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="tx-hash"
                          >
                            {tx.hash.substring(0, 10)}...{tx.hash.substring(tx.hash.length - 8)}
                          </a>
                        </div>
                        <div className="tx-details">
                          <div className="tx-row">
                            <span className="tx-key">From:</span>
                            <span className="tx-value">{tx.from.substring(0, 8)}...{tx.from.substring(tx.from.length - 6)}</span>
                          </div>
                          <div className="tx-row">
                            <span className="tx-key">To:</span>
                            <span className="tx-value">{tx.to ? `${tx.to.substring(0, 8)}...${tx.to.substring(tx.to.length - 6)}` : 'Contract Creation'}</span>
                          </div>
                          <div className="tx-row">
                            <span className="tx-key">Value:</span>
                            <span className="tx-value">{tx.value} ETH</span>
                          </div>
                          <div className="tx-row">
                            <span className="tx-key">Block:</span>
                            <span className="tx-value">{tx.blockNumber}</span>
                          </div>
                          {tx.timestamp && (
                            <div className="tx-row">
                              <span className="tx-key">Time:</span>
                              <span className="tx-value">{new Date(tx.timestamp * 1000).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loading && transactions.length === 0 && profile && (
                <div style={{marginTop:24}}>
                  <div className="skeleton skeleton-line" style={{width:'40%',marginBottom:12}} />
                  <div className="skeleton skeleton-line" style={{height:60,marginBottom:8}} />
                  <div className="skeleton skeleton-line" style={{height:60,marginBottom:8}} />
                  <div className="skeleton skeleton-line" style={{height:60}} />
                </div>
              )}
            </div>
          </div>
        )}

        <section style={{marginTop:16}}>
          <h2>Logs: </h2>
          <div className="log-area" aria-live="polite">
            {logs.length === 0 && <div className="log-empty">No logs yet</div>}
            {logs.map((l, idx) => (
              <div key={idx} className={`log-entry log-${l.level}`}>
                <div className="log-time">{l.time}</div>
                <div className="log-text">{l.text}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
