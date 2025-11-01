'use client'

import { useEffect, useState, useRef } from 'react'
import { gsap } from 'gsap'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface KeywordConfig {
  discount: number
}

interface ChannelKeyword {
  keyword: string
  discount: number
}

interface BlacklistedChannel {
  channel_id: string
  nickname: string
}

interface UserConfig {
  global_keywords: Record<string, KeywordConfig>
  channel_keywords: Record<string, ChannelKeyword[]>
  negative_keywords: string[]
  blacklisted_channels: (string | BlacklistedChannel)[]
}

type ConfigData = Record<string, UserConfig>

// Animated wrapper component for new items
function AnimatedItem({ children, itemKey }: { children: React.ReactNode; itemKey: string }) {
  const itemRef = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!hasAnimated.current && itemRef.current) {
      gsap.fromTo(
        itemRef.current,
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
      )
      hasAnimated.current = true
    }
  }, [])

  return <div ref={itemRef}>{children}</div>
}

export default function Home() {
  const [configs, setConfigs] = useState<ConfigData | null>(null)
  const [originalConfigs, setOriginalConfigs] = useState<ConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string>('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [globalKeywordSort, setGlobalKeywordSort] = useState<'name' | 'discount'>('name')
  const [channelKeywordSort, setChannelKeywordSort] = useState<'name' | 'discount'>('name')
  const [editingGlobalKeyword, setEditingGlobalKeyword] = useState<string | null>(null)
  const [tempGlobalKeywordValue, setTempGlobalKeywordValue] = useState<string>('')
  const [tempGlobalKeywordDiscount, setTempGlobalKeywordDiscount] = useState<string>('0')
  const [globalOpen, setGlobalOpen] = useState<string | undefined>('global')
  const [channelOpen, setChannelOpen] = useState<string | undefined>('channel')
  const [negativeOpen, setNegativeOpen] = useState<string | undefined>('negative')
  const [blacklistOpen, setBlacklistOpen] = useState<string | undefined>('blacklist')
  const [newKeywordInput, setNewKeywordInput] = useState<string>('')
  const [newKeywordDiscount, setNewKeywordDiscount] = useState<string>('0')
  const [showNewKeywordForm, setShowNewKeywordForm] = useState(false)

  useEffect(() => {
    fetch('/configs.json')
      .then(res => res.json())
      .then(data => {
        setConfigs(data)
        setOriginalConfigs(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading configs:', err)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (configs && originalConfigs) {
      setHasUnsavedChanges(JSON.stringify(configs) !== JSON.stringify(originalConfigs))
    }
  }, [configs, originalConfigs])

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage('')
    try {
      const response = await fetch('/api/save-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configs),
      })

      if (response.ok) {
        setSaveMessage('✓ Saved successfully')
        setOriginalConfigs(configs)
        setHasUnsavedChanges(false)
        setTimeout(() => setSaveMessage(''), 3000)
      } else {
        setSaveMessage('✗ Failed to save')
      }
    } catch (err) {
      console.error('Error saving configs:', err)
      setSaveMessage('✗ Error saving')
    } finally {
      setSaving(false)
    }
  }

  const updateGlobalKeyword = (userId: string, oldKeyword: string, newKeyword: string, discount: number, isBlur: boolean = false) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const globalKeywords = { ...userConfig.global_keywords }

    // Only update the key when blurring (finishing edit)
    if (isBlur && oldKeyword !== newKeyword) {
      delete globalKeywords[oldKeyword]
      globalKeywords[newKeyword] = { discount }
    } else {
      // During typing, just update the discount
      globalKeywords[oldKeyword] = { discount }
    }

    userConfig.global_keywords = globalKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const deleteGlobalKeyword = (userId: string, keyword: string) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const globalKeywords = { ...userConfig.global_keywords }

    delete globalKeywords[keyword]
    userConfig.global_keywords = globalKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const addGlobalKeyword = (userId: string) => {
    if (!configs || !newKeywordInput.trim()) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const globalKeywords = { ...userConfig.global_keywords }

    // Add the new keyword with the specified discount
    globalKeywords[newKeywordInput.trim()] = { discount: parseInt(newKeywordDiscount) || 0 }
    userConfig.global_keywords = globalKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)

    // Reset form
    setNewKeywordInput('')
    setNewKeywordDiscount('0')
    setShowNewKeywordForm(false)
  }

  const updateChannelKeyword = (userId: string, channelId: string, idx: number, keyword: string, discount: number) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const channelKeywords = { ...userConfig.channel_keywords }
    const keywords = [...(channelKeywords[channelId] || [])]

    keywords[idx] = { keyword, discount }
    channelKeywords[channelId] = keywords
    userConfig.channel_keywords = channelKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const updateChannelId = (userId: string, oldChannelId: string, newChannelId: string) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const channelKeywords = { ...userConfig.channel_keywords }

    if (oldChannelId !== newChannelId) {
      const keywords = channelKeywords[oldChannelId]
      delete channelKeywords[oldChannelId]
      channelKeywords[newChannelId] = keywords
    }

    userConfig.channel_keywords = channelKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const deleteChannelKeyword = (userId: string, channelId: string, idx: number) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const channelKeywords = { ...userConfig.channel_keywords }
    const keywords = [...(channelKeywords[channelId] || [])]

    keywords.splice(idx, 1)

    if (keywords.length === 0) {
      delete channelKeywords[channelId]
    } else {
      channelKeywords[channelId] = keywords
    }

    userConfig.channel_keywords = channelKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const addChannelKeyword = (userId: string, channelId: string) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const channelKeywords = { ...userConfig.channel_keywords }
    const keywords = [...(channelKeywords[channelId] || [])]

    keywords.push({ keyword: '', discount: 0 })
    channelKeywords[channelId] = keywords
    userConfig.channel_keywords = channelKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const addNewChannel = (userId: string) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const channelKeywords = { ...userConfig.channel_keywords }

    let counter = 1
    let newChannelId = `channel-${counter}`
    while (channelKeywords[newChannelId]) {
      counter++
      newChannelId = `channel-${counter}`
    }

    channelKeywords[newChannelId] = [{ keyword: '', discount: 0 }]
    userConfig.channel_keywords = channelKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const updateNegativeKeyword = (userId: string, idx: number, keyword: string) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const negativeKeywords = [...userConfig.negative_keywords]

    negativeKeywords[idx] = keyword
    userConfig.negative_keywords = negativeKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const deleteNegativeKeyword = (userId: string, idx: number) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const negativeKeywords = [...userConfig.negative_keywords]

    negativeKeywords.splice(idx, 1)
    userConfig.negative_keywords = negativeKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const addNegativeKeyword = (userId: string) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const negativeKeywords = [...userConfig.negative_keywords]

    negativeKeywords.push('')
    userConfig.negative_keywords = negativeKeywords
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const updateBlacklistedChannel = (userId: string, idx: number, channelId: string, nickname: string) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const blacklistedChannels = [...userConfig.blacklisted_channels]

    blacklistedChannels[idx] = { channel_id: channelId, nickname }
    userConfig.blacklisted_channels = blacklistedChannels
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const deleteBlacklistedChannel = (userId: string, idx: number) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const blacklistedChannels = [...userConfig.blacklisted_channels]

    blacklistedChannels.splice(idx, 1)
    userConfig.blacklisted_channels = blacklistedChannels
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  const addBlacklistedChannel = (userId: string) => {
    if (!configs) return

    const newConfigs = { ...configs }
    const userConfig = { ...newConfigs[userId] }
    const blacklistedChannels = [...userConfig.blacklisted_channels]

    blacklistedChannels.push({ channel_id: '', nickname: '' })
    userConfig.blacklisted_channels = blacklistedChannels
    newConfigs[userId] = userConfig

    setConfigs(newConfigs)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-xl text-gray-300">Loading...</div>
      </div>
    )
  }

  if (!configs) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-xl text-red-400">Error loading configuration data</div>
      </div>
    )
  }

  const selectedUser = selectedUserId && configs ? [[selectedUserId, configs[selectedUserId]] as [string, UserConfig]] : []

  const sortGlobalKeywords = (keywords: Record<string, KeywordConfig>) => {
    const entries = Object.entries(keywords)
    // Separate keywords being edited or empty
    const beingEdited = entries.filter(([key]) => key === '' || key === editingGlobalKeyword)
    const notEditing = entries.filter(([key]) => key !== '' && key !== editingGlobalKeyword)

    // Sort keywords not being edited
    let sorted: [string, KeywordConfig][]
    if (globalKeywordSort === 'name') {
      sorted = notEditing.sort(([a], [b]) => a.localeCompare(b))
    } else {
      sorted = notEditing.sort(([, a], [, b]) => b.discount - a.discount)
    }

    // Add keywords being edited at the end
    return [...sorted, ...beingEdited]
  }

  const sortChannelKeywords = (keywords: ChannelKeyword[]) => {
    if (channelKeywordSort === 'name') {
      return [...keywords].sort((a, b) => a.keyword.localeCompare(b.keyword))
    } else {
      return [...keywords].sort((a, b) => b.discount - a.discount)
    }
  }

  return (
    <div className="min-h-screen bg-dark-navy py-8 px-4">
      <div className="max-w-8xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-7">
          <div className="flex items-center gap-4">
            <img src="/paragn-logo-white.png" alt="Paragon Logo" className="h-8 md:h-12" />
            <div>
              <h1 className="text-lg md:text-4xl font-bold text-white mb-2">Pinger config</h1>
              <p className="text-gray-400">Total Users: {Object.keys(configs).length}</p>
            </div>
          </div>

        <div className="mb-0">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full max-w-xl px-4 py-2 border border-gray-700 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent bg-gray-900 text-white"
          >
            <option value="">Select a user...</option>
            {Object.keys(configs).map(userId => (
              <option key={userId} value={userId}>{userId}</option>
            ))}
          </select>
              {/* <h2 className="text-xl font-semibold text-white mb-4">
                User ID: {selectedUserId}
              </h2> */}


        </div>

          <div className="flex items-center gap-4">
            {hasUnsavedChanges && !saveMessage && (
              <span className="text-sm text-red-600 font-medium">
                You have unsaved changes!
              </span>
            )}
            {saveMessage && (
              <span className={`text-sm ${saveMessage.includes('✓') ? 'text-green' : 'text-red-400'}`}>
                {saveMessage}
              </span>
            )}
            <button
              onClick={handleSave}
              type='button'
              disabled={saving || !hasUnsavedChanges}
              className="px-6 py-2 bg-green text-black rounded-lg hover:bg-gray-200 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {!selectedUserId && (
          <div className="text-center text-gray-500 mt-16">
            Please select a user from the dropdown above.
          </div>
        )}

        <div className="space-y-6">
          {selectedUser.map(([userId, config]) => (
            <div key={userId} className="">
              <div className="flex flex-col md:flex-row gap-4">
                  <div className='w-full'>
                  {/* Global Keywords */}
                  <Accordion
                    type="single"
                    className="w-full mb-4"
                    value={globalOpen}
                    onValueChange={setGlobalOpen}
                    collapsible
                  >
                    <AccordionItem value="global" className="border-border border px-4 rounded-lg">
                      <AccordionTrigger className="text-lg font-semibold text-gray-300 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-3">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center bg-gray-700 rounded-full w-6 h-6 text-xs text-gray-300">
                              {Object.keys(config.global_keywords).length}
                            </span>
                            Global Keywords
                          </div>
                          {globalOpen === 'global' && (
                            <div className="flex items-center gap-2 animate-in fade-in duration-300">
                              <select
                                value={globalKeywordSort}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  setGlobalKeywordSort(e.target.value as 'name' | 'discount')
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-300 rounded text-sm hover:bg-gray-700"
                              >
                                <option value="name">Name</option>
                                <option value="discount">% Off</option>
                              </select>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowNewKeywordForm(true)
                                }}
                                className="btn"
                                type='button'
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className='bg-transparent'>
                    {showNewKeywordForm && (
                      <div className="mb-4 p-3 bg-gradient-card rounded border border-border">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newKeywordInput}
                            onChange={(e) => setNewKeywordInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addGlobalKeyword(userId)
                              } else if (e.key === 'Escape') {
                                setShowNewKeywordForm(false)
                                setNewKeywordInput('')
                                setNewKeywordDiscount('0')
                              }
                            }}
                            placeholder="Keyword name"
                            className="flex-1 text-gray-200 bg-black px-2 py-2 rounded border border-gray-700 focus:border-gray-500 outline-none"
                            autoFocus
                          />
                          <input
                            type="text"
                            inputMode="numeric"
                            value={newKeywordDiscount}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '')
                              setNewKeywordDiscount(value)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addGlobalKeyword(userId)
                              } else if (e.key === 'Escape') {
                                setShowNewKeywordForm(false)
                                setNewKeywordInput('')
                                setNewKeywordDiscount('0')
                              }
                            }}
                            placeholder="0"
                            className="text-gray-200 bg-black px-2 py-2 rounded border border-gray-700 focus:border-gray-500 outline-none w-16"
                          />
                          <span className="text-sm text-gray-400">% off</span>
                          <button
                            onClick={() => addGlobalKeyword(userId)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                            type='button'
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setShowNewKeywordForm(false)
                              setNewKeywordInput('')
                              setNewKeywordDiscount('0')
                            }}
                            className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                            type='button'
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {Object.keys(config.global_keywords).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                        {sortGlobalKeywords(config.global_keywords).map(([keyword, data]) => (
                          <AnimatedItem key={`${userId}-global-${keyword}-${data.discount}`} itemKey={`${userId}-global-${keyword}-${data.discount}`}>
                            {editingGlobalKeyword === keyword ? (
                              <div className="flex items-center gap-2 bg-gradient-card px-3 py-2 rounded border border-border">
                                <input
                                  type="text"
                                  value={tempGlobalKeywordValue}
                                  onChange={(e) => setTempGlobalKeywordValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      updateGlobalKeyword(userId, keyword, tempGlobalKeywordValue, parseInt(tempGlobalKeywordDiscount) || 0, true)
                                      setEditingGlobalKeyword(null)
                                    } else if (e.key === 'Escape') {
                                      setEditingGlobalKeyword(null)
                                    }
                                  }}
                                  onBlur={(e) => {
                                    // Check if we're moving to another input in the same form
                                    const relatedTarget = e.relatedTarget as HTMLElement
                                    if (relatedTarget && relatedTarget.closest('.flex.items-center.gap-2') === e.currentTarget.closest('.flex.items-center.gap-2')) {
                                      return
                                    }
                                    setEditingGlobalKeyword(null)
                                  }}
                                  placeholder="Keyword name"
                                  className="flex-1 text-gray-200 bg-black px-2 py-2 rounded border border-gray-700 focus:border-gray-500 outline-none"
                                  autoFocus
                                />
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={tempGlobalKeywordDiscount}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '')
                                    setTempGlobalKeywordDiscount(value)
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      updateGlobalKeyword(userId, keyword, tempGlobalKeywordValue, parseInt(tempGlobalKeywordDiscount) || 0, true)
                                      setEditingGlobalKeyword(null)
                                    } else if (e.key === 'Escape') {
                                      setEditingGlobalKeyword(null)
                                    }
                                  }}
                                  onBlur={(e) => {
                                    // Check if we're moving to another input in the same form
                                    const relatedTarget = e.relatedTarget as HTMLElement
                                    if (relatedTarget && relatedTarget.closest('.flex.items-center.gap-2') === e.currentTarget.closest('.flex.items-center.gap-2')) {
                                      return
                                    }
                                    setEditingGlobalKeyword(null)
                                  }}
                                  placeholder="0"
                                  className="text-gray-200 bg-black px-2 py-2 rounded border border-gray-700 focus:border-gray-500 outline-none w-16"
                                />
                                <span className="text-sm text-gray-400">% off</span>
                                <button
                                  onClick={() => {
                                    updateGlobalKeyword(userId, keyword, tempGlobalKeywordValue, parseInt(tempGlobalKeywordDiscount) || 0, true)
                                    setEditingGlobalKeyword(null)
                                  }}
                                  className="px-3 py-1 bg-transparent text-green-500 rounded hover:text-green-400 text-sm text-xl"
                                  type='button'
                                >
                                  ✓
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2 bg-gradient-card px-3 py-2 rounded border border-border">
                                <span className="text-gray-200 font-medium">{keyword}</span>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm ${data.discount === 0 ? 'text-red-400' : 'text-gray-400'}`}>{data.discount}% off</span>
                                  <button
                                    onClick={() => {
                                      setEditingGlobalKeyword(keyword)
                                      setTempGlobalKeywordValue(keyword)
                                      setTempGlobalKeywordDiscount(data.discount.toString())
                                    }}
                                    type='button'
                                    className="text-gray-400 hover:text-gray-200"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => deleteGlobalKeyword(userId, keyword)}
                                    type='button'
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            )}
                          </AnimatedItem>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 italic">No global keywords</p>
                    )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {/* Negative Keywords */}
                  <Accordion
                    type="single"
                    className="w-full"
                    value={negativeOpen}
                    onValueChange={setNegativeOpen}
                    collapsible
                  >
                    <AccordionItem value="negative" className="border-border border px-4 rounded-lg">
                      <AccordionTrigger className="text-lg font-semibold text-gray-300 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-3">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center bg-gray-700 rounded-full w-6 h-6 text-xs text-gray-300">
                              {config.negative_keywords.length}
                            </span>
                            Negative Keywords
                          </div>
                          {negativeOpen === 'negative' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                addNegativeKeyword(userId)
                              }}
                              className="btn animate-in fade-in duration-300"
                              type='button'
                            >
                              +
                            </button>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                    {config.negative_keywords.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {config.negative_keywords.map((keyword, idx) => (
                          <AnimatedItem key={`${userId}-negative-${idx}`} itemKey={`${userId}-negative-${idx}`}>
                            <div className="flex items-center gap-1 bg-red-900 text-red-200 px-3 py-1 rounded-full text-sm border border-red-800">
                            <input
                              type="text"
                              value={keyword}
                              onChange={(e) => updateNegativeKeyword(userId, idx, e.target.value)}
                              placeholder="Keyword"
                              className="bg-transparent outline-none border-b border-transparent hover:border-red-400 focus:border-red-400"
                              size={Math.max(1, keyword.length || 7)}
                            />
                            <button
                              onClick={() => deleteNegativeKeyword(userId, idx)}
                              className="text-red-300 hover:text-red-200 ml-1"
                              type='button'
                            >
                              ×
                            </button>
                            </div>
                          </AnimatedItem>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 italic">No negative keywords</p>
                    )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                </div>
                <div className='w-full'>
                  {/* Channel Keywords */}
                  <Accordion
                    type="single"
                    className="w-full mb-4"
                    value={channelOpen}
                    onValueChange={setChannelOpen}
                    collapsible
                  >
                    <AccordionItem value="channel" className="border-border border px-4 rounded-lg">
                      <AccordionTrigger className="text-lg font-semibold text-gray-300 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-3">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center bg-gray-700 rounded-full w-6 h-6 text-xs text-gray-300">
                              {Object.keys(config.channel_keywords).length}
                            </span>
                            Channel Keywords
                          </div>
                          {channelOpen === 'channel' && (
                            <div className="flex items-center gap-2 animate-in fade-in duration-300">
                              <select
                                value={channelKeywordSort}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  setChannelKeywordSort(e.target.value as 'name' | 'discount')
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-300 rounded text-sm hover:bg-gray-700"
                              >
                                <option value="name">Name</option>
                                <option value="discount">% Off</option>
                              </select>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  addNewChannel(userId)
                                }}
                                type='button'
                                className="btn"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                    {Object.keys(config.channel_keywords).length > 0 ? (
                      <div className="space-y-3">
                        {Object.entries(config.channel_keywords).map(([channelId, keywords], channelIdx) => (
                          <AnimatedItem key={`${userId}-channel-${channelIdx}`} itemKey={`${userId}-channel-${channelIdx}`}>
                            <div className="bg-gradient-card p-3 rounded border border-border">
                            <div className="text-sm mb-2 flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">Channel:</span>
                                <input
                                  type="text"
                                  value={channelId}
                                  onChange={(e) => updateChannelId(userId, channelId, e.target.value)}
                                  placeholder="Channel number (19 digits)"
                                  className="text-gray-200 bg-black px-2 py-2 rounded border border-border focus:border-gray-600 outline-none w-[200px]"
                                />
                              </div>
                              <button
                                onClick={() => addChannelKeyword(userId, channelId)}
                                className="btn-sm"
                                type='button'
                              >
                                + Keyword
                              </button>
                            </div>
                            {sortChannelKeywords(keywords).map((kw) => {
                              const idx = keywords.findIndex(k => k.keyword === kw.keyword && k.discount === kw.discount)
                              return (
                                <div key={idx} className="flex gap-2 items-center mb-2">
                                  <input
                                    type="text"
                                    value={kw.keyword}
                                    onChange={(e) => updateChannelKeyword(userId, channelId, idx, e.target.value, kw.discount)}
                                    placeholder="Keyword text"
                                    className="text-gray-200 bg-black px-2 py-2 rounded border border-gray-700 focus:border-gray-600 outline-none flex-1"
                                  />
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={kw.discount}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/\D/g, '')
                                      updateChannelKeyword(userId, channelId, idx, kw.keyword, value === '' ? 0 : parseInt(value))
                                    }}
                                    className="text-gray-200 bg-black px-2 py-2 rounded border border-gray-700 focus:border-gray-600 outline-none text-sm w-16"
                                  />
                                  <span className="text-gray-400 text-sm">% off</span>
                                  <button
                                    onClick={() => deleteChannelKeyword(userId, channelId, idx)}
                                    className="text-red-400 hover:text-red-300"
                                    type='button'
                                  >
                                    ×
                                  </button>
                                </div>
                              )
                            })}
                            </div>
                          </AnimatedItem>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 italic">No channel keywords</p>
                    )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  {/* Blacklisted Channels */}
                  <Accordion
                    type="single"
                    className="w-full"
                    value={blacklistOpen}
                    onValueChange={setBlacklistOpen}
                    collapsible
                  >
                    <AccordionItem value="blacklist" className="border-border border px-4 rounded-lg">
                      <AccordionTrigger className="text-lg font-semibold text-gray-300 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-3">
                          <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center bg-gray-700 rounded-full w-6 h-6 text-xs text-gray-300">
                              {config.blacklisted_channels.length}
                            </span>
                            Blacklisted Channels
                          </div>
                          {blacklistOpen === 'blacklist' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                addBlacklistedChannel(userId)
                              }}
                              className="btn animate-in fade-in duration-300"
                              type='button'
                            >
                              +
                            </button>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                    {config.blacklisted_channels.length > 0 ? (
                      <div className="space-y-3">
                        {config.blacklisted_channels.map((channel, idx) => {
                          const channelData = typeof channel === 'string'
                            ? { channel_id: channel, nickname: channel }
                            : channel
                          return (
                            <AnimatedItem key={`${userId}-blacklist-${idx}`} itemKey={`${userId}-blacklist-${idx}`}>

                              <div className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  value={channelData.channel_id}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '')
                                    if (value.length <= 19) {
                                      updateBlacklistedChannel(userId, idx, value, channelData.nickname)
                                    }
                                  }}
                                  placeholder="Channel ID (19 digits)"
                                  className={`text-gray-200 bg-black px-2 py-2 rounded border outline-none flex-1 ${
                                    channelData.channel_id.length === 19 ? 'border-gray-700 focus:border-gray-600' : 'border-orange-500 focus:border-orange-400'
                                  }`}
                                />
                                <input
                                  type="text"
                                  value={channelData.nickname}
                                  onChange={(e) => updateBlacklistedChannel(userId, idx, channelData.channel_id, e.target.value)}
                                  placeholder="Nickname"
                                  className="text-gray-200 bg-black px-2 py-2 rounded border border-gray-700 focus:border-gray-600 outline-none flex-1"
                                />
                                <button
                                  onClick={() => deleteBlacklistedChannel(userId, idx)}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  ×
                                </button>
                              </div>
                            </AnimatedItem>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-600 italic">No blacklisted channels</p>
                    )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
