import React from 'react'

const SearchBar = (props) => {



    function onChange(e){
        props.onChange(e.target.value);
    }
  return (
    <div className='SearchBar'>
        <div>
            <input type="text" placeholder='Search...' onChange={onChange} />
        </div>
    </div>

  )
}

export default SearchBar