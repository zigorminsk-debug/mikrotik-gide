// Package assets отдаёт общий веб-интерфейс учебника.
//
// Один и тот же каталог app/src/main/assets/www используется и в Android-версии,
// и в настольной Windows-версии, поэтому любая правка статьи, схемы или стиля
// автоматически попадает в обе сборки.
package assets

import (
	"embed"
	"io/fs"
)

//go:embed all:app/src/main/assets/www
var files embed.FS

// WWW возвращает корень веб-приложения (index.html, js/, css/).
func WWW() fs.FS {
	sub, err := fs.Sub(files, "app/src/main/assets/www")
	if err != nil {
		// каталог зашит в бинарник, ошибка возможна только при поломке сборки
		panic(err)
	}
	return sub
}
