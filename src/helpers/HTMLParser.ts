export const htmlStringParser = (htmlString: string) => {
    const parsedString = htmlString.replace(/<[^>]+>/g, '\n').split('&nbsp;').join(' ');
    const lines = parsedString.split('\n')
    const filteredLines = lines.filter(i => {
        return i !== ""
    })
    return {
        title: filteredLines.length > 0 ? filteredLines[0] : 'Alert',
        subtitle: filteredLines.length > 1 ? filteredLines[1] : ''
    }
}