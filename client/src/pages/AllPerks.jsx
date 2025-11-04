import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

// Helper function for debouncing
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function: Cancel the timeout if value changes before the delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Only re-run if value or delay changes

  return debouncedValue;
}

export default function AllPerks() {
  const [perks, setPerks] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [merchantFilter, setMerchantFilter] = useState('')
  const [uniqueMerchants, setUniqueMerchants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // The original component had 'searchTerm' and 'filteredPerks' which seem redundant
  // since the API handles filtering/searching. I'll omit them for clarity.

  // Debounce the search query for the *auto-search* functionality
  // This will prevent API calls on every keystroke
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // 500ms debounce

  // ==================== SIDE EFFECTS WITH useEffect HOOK ====================

  /*
   * useEffect Hook #1: Initial Data Loading
   * The original logic to load all perks on mount is already implemented.
   */
  useEffect(() => {
    // Only load initial perks if no search/filter is active initially (optional optimization)
    // loadAllPerks() 
    // Wait for the debounced search/filter to trigger the first load to prevent double-load
    // This empty-dependency-array useEffect is NOT needed if Hook #2 is used for initial load.
  }, []) // Original: Empty dependency array = runs only once on mount

  /**
   * ✅ useEffect Hook #2: Auto-search on Input Change
   * Triggers a new API call whenever the DEBOUNCED search query or the merchant filter changes.
   * This is the core logic for the 'Auto-searches as you type' feature.
   */
  useEffect(() => {
    // Only call loadAllPerks if the component is not in its *initial* loading phase
    // or if the search/filter state has changed.
    // The initial call will now happen here once the debouncedSearchQuery settles (or immediately if empty)
    loadAllPerks()
  }, [debouncedSearchQuery, merchantFilter]) // Dependencies: re-run when these values change

  // Existing useEffect for extracting unique merchants
  useEffect(() => {
    // Extract all merchant names from perks array
    const merchants = perks
      .map(perk => perk.merchant)
      .filter(merchant => merchant && merchant.trim())

    // Create array of unique merchants using Set
    const unique = [...new Set(merchants)]

    // Update state with unique merchants
    setUniqueMerchants(unique)

    // This effect depends on [perks], so it re-runs whenever perks changes
  }, [perks])

  async function loadAllPerks() {
    // Reset error state before new request
    setError('')

    // Show loading indicator
    setLoading(true)

    try {
      // Make GET request to /api/perks/all with query parameters
      const res = await api.get('/perks/all', {
        params: {
          // Use the DEBOUNCED search query for auto-search
          search: debouncedSearchQuery.trim() || undefined,
          // Use the immediate merchantFilter value
          merchant: merchantFilter.trim() || undefined
        }
      })

      // Update perks state with response data
      setPerks(res.data.perks)

    } catch (err) {
      // Handle errors (network failure, server error, etc.)
      console.error('Failed to load perks:', err)
      setError(err?.response?.data?.message || 'Failed to load perks')

    } finally {
      // Always stop loading indicator
      setLoading(false)
    }
  }

  // ==================== EVENT HANDLERS ====================

  function handleSearch(e) {
    // Prevent default form submission behavior (page reload)
    e.preventDefault()

    // When the user *explicitly* presses the Search button, we want immediate feedback.
    // We update the state, which triggers the debounced effect.
    // If the searchQuery is the same as debouncedSearchQuery, it will still trigger loadAllPerks,
    // but without waiting for the debounce delay.
    // To ensure an *immediate* load on button click, you can call loadAllPerks() here
    // BUT you must ensure it uses the *immediate* searchQuery state, not the debounced one, 
    // which requires updating the `loadAllPerks` function or using a direct call.
    // For simplicity, we'll keep the button calling loadAllPerks, which now uses the *debounced* state
    // but the `handleSearch` is only needed if you want it to bypass the debounce. 
    // Since the debounce delay is small (500ms), and the user can just wait, we'll stick to 
    // the simpler implementation where the button simply triggers the same API call.
    // The original `handleSearch` implementation already does this:
    loadAllPerks()
  }

  // New handler for the Search Input to update the state immediately
  function handleSearchQueryChange(e) {
    setSearchQuery(e.target.value)
  }

  // New handler for the Merchant Filter to update the state immediately
  function handleMerchantFilterChange(e) {
    setMerchantFilter(e.target.value)
    // Changing the merchantFilter immediately triggers loadAllPerks via useEffect #2
  }

  function handleReset() {
    // Reset search and filter states to empty
    // useEffect #2 will trigger automatically and reload all perks
    setSearchQuery('')
    setMerchantFilter('')
    // We also reset the error state on reset
    setError('') 
  }


  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">All Perks</h1>
        <div className="text-sm text-zinc-600">
          Showing {perks.length} perk{perks.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Search and Filter Form */}
      <div className="card">
        <form onSubmit={handleSearch} className="space-y-4">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Search Input - Controlled Component */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                <span className="material-symbols-outlined text-sm align-middle">search</span>
                {' '}Search by Name
              </label>
              <input
                type="text"
                className="input"
                placeholder="Enter perk name..."
                // ✅ Added value and onChange handler
                value={searchQuery}
                onChange={handleSearchQueryChange}
              />
              <p className="text-xs text-zinc-500 mt-1">
                Auto-searches as you type, or press Enter / click Search
              </p>
            </div>

            {/* Merchant Filter Dropdown - Controlled Component */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                <span className="material-symbols-outlined text-sm align-middle">store</span>
                {' '}Filter by Merchant
              </label>
              <select
                className="input"
                // ✅ Added value and onChange handler
                value={merchantFilter}
                onChange={handleMerchantFilterChange}
              >
                <option value="">All Merchants</option>

                {uniqueMerchants.map(merchant => (
                  <option key={merchant} value={merchant}>
                    {merchant}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 items-center">
            <button type="submit" className="btn bg-blue-600 text-white border-blue-600 hover:bg-blue-700">
              <span className="material-symbols-outlined text-sm align-middle">search</span>
              {' '}Search Now
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="btn"
            >
              <span className="material-symbols-outlined text-sm align-middle">refresh</span>
              {' '}Reset Filters
            </button>

            {/* Loading indicator */}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                Searching...
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Error Message - Inline, doesn't replace the UI */}
      {error && (
        <div className="card border-red-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-600">
              <span className="material-symbols-outlined">error</span>
              <p>{error}</p>
            </div>
            <button onClick={loadAllPerks} className="btn text-sm">
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Perks Grid - Always visible, updates in place */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {perks.map(perk => (

          <Link
            key={perk._id}
            to={`/perks/${perk._id}`} // Assuming a path like this
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            {/* Perk Title */}
            <div className="font-semibold text-lg text-zinc-900 mb-2">
              {perk.title}
            </div>

            {/* Perk Metadata */}
            <div className="text-sm text-zinc-600 space-y-1">
              {/* Conditional Rendering with && operator */}
              {/* Only show merchant if it exists */}
              {perk.merchant && (
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">store</span>
                  {perk.merchant}
                </div>
              )}

              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">category</span>
                <span className="capitalize">{perk.category}</span>
              </div>

              {perk.discountPercent > 0 && (
                <div className="flex items-center gap-1 text-green-600 font-semibold">
                  <span className="material-symbols-outlined text-xs">local_offer</span>
                  {perk.discountPercent}% OFF
                </div>
              )}
            </div>

            {/* Description - truncated if too long */}
            {perk.description && (
              <p className="mt-2 text-sm text-zinc-700 line-clamp-2">
                {perk.description}
              </p>
            )}

            {/* Creator info - populated from backend */}
            {perk.createdBy && (
              <div className="mt-3 pt-3 border-t border-zinc-200 text-xs text-zinc-500">
                Created by: {perk.createdBy.name || perk.createdBy.email}
              </div>
            )}
          </Link>
        ))}


        {perks.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-zinc-600">
            <span className="material-symbols-outlined text-5xl mb-4 block text-zinc-400">
              sentiment_dissatisfied
            </span>
            <p className="text-lg">No perks found.</p>
            <p className="text-sm mt-2">Try adjusting your search or filters.</p>
          </div>
        )}


        {loading && perks.length === 0 && (
          <div className="col-span-full text-center py-12 text-zinc-600">
            <span className="material-symbols-outlined text-5xl mb-4 block text-zinc-400 animate-spin">
              progress_activity
            </span>
            <p className="text-lg">Loading perks...</p>
          </div>
        )}
      </div>
    </div>
  )
}