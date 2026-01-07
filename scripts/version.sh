if sed --version >/dev/null 2>&1; then
	sed -i -E "s~https://unpkg\.com/@mattzh72/lodestone@[0-9a-z\.-]+~https://unpkg.com/@mattzh72/lodestone@${npm_package_version}~" README.md
else
	sed -i '' -E "s~https://unpkg\.com/@mattzh72/lodestone@[0-9a-z\.-]+~https://unpkg.com/@mattzh72/lodestone@${npm_package_version}~" README.md
fi
git add README.md
